import React, { useState, useEffect } from 'react';
import {
  FiActivity, FiTrendingUp, FiAlertCircle, FiCheckCircle,
  FiClock, FiDatabase, FiCpu, FiZap, FiUsers, FiBarChart2,
  FiPlay, FiPause, FiRefreshCw, FiSettings, FiEye, FiEyeOff
} from 'react-icons/fi';
import './MonitoringDashboard.css';

const MonitoringDashboard = ({ isVisible, onToggle }) => {
  const [metrics, setMetrics] = useState({
    activeWorkflows: 12,
    completedToday: 156,
    failedToday: 3,
    avgExecutionTime: 2.4,
    cpuUsage: 45,
    memoryUsage: 62,
    databaseConnections: 8,
    apiRequests: 234
  });

  const [executionLogs, setExecutionLogs] = useState([
    { id: 1, timestamp: '14:32:15', node: 'Data Processor', status: 'completed', duration: '1.2s', message: 'Successfully processed 1,234 records' },
    { id: 2, timestamp: '14:31:42', node: 'API Connector', status: 'running', duration: '0.8s', message: 'Fetching data from external API' },
    { id: 3, timestamp: '14:31:18', node: 'ML Model', status: 'completed', duration: '3.1s', message: 'Model prediction completed with 95% accuracy' },
    { id: 4, timestamp: '14:30:55', node: 'Database Writer', status: 'error', duration: '0.5s', message: 'Connection timeout - retrying...' },
    { id: 5, timestamp: '14:30:22', node: 'File Upload', status: 'completed', duration: '2.3s', message: 'Uploaded 5.2MB file successfully' }
  ]);

  const [systemHealth, setSystemHealth] = useState({
    overall: 'healthy',
    services: {
      database: { status: 'healthy', latency: 45 },
      api: { status: 'healthy', latency: 120 },
      ml: { status: 'warning', latency: 800 },
      storage: { status: 'healthy', latency: 30 }
    }
  });

  const [selectedTab, setSelectedTab] = useState('overview');

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        apiRequests: prev.apiRequests + Math.floor(Math.random() * 5),
        cpuUsage: Math.max(20, Math.min(80, prev.cpuUsage + (Math.random() - 0.5) * 10)),
        memoryUsage: Math.max(30, Math.min(90, prev.memoryUsage + (Math.random() - 0.5) * 5))
      }));

      // Add new log entry
      const newLog = {
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        node: ['Data Processor', 'API Connector', 'ML Model', 'Database Writer'][Math.floor(Math.random() * 4)],
        status: ['completed', 'running', 'error'][Math.floor(Math.random() * 3)],
        duration: (Math.random() * 5).toFixed(1) + 's',
        message: 'Processing data...'
      };

      setExecutionLogs(prev => [newLog, ...prev.slice(0, 9)]);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'running': return '#3b82f6';
      case 'error': return '#ef4444';
      case 'warning': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getHealthColor = (status) => {
    switch (status) {
      case 'healthy': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const MetricCard = ({ icon, title, value, unit, trend, color }) => (
    <div className="metric-card">
      <div className="metric-icon" style={{ backgroundColor: color }}>
        {icon}
      </div>
      <div className="metric-content">
        <div className="metric-title">{title}</div>
        <div className="metric-value">
          {value}{unit && <span className="metric-unit">{unit}</span>}
        </div>
        {trend && (
          <div className={`metric-trend ${trend > 0 ? 'positive' : 'negative'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </div>
        )}
      </div>
    </div>
  );

  const HealthIndicator = ({ service, data }) => (
    <div className="health-indicator">
      <div className="health-header">
        <span className="health-name">{service}</span>
        <div 
          className="health-status" 
          style={{ backgroundColor: getHealthColor(data.status) }}
        />
      </div>
      <div className="health-latency">{data.latency}ms</div>
    </div>
  );

  return (
    <div className={`monitoring-dashboard ${isVisible ? 'visible' : ''}`}>
      <div className="dashboard-header">
        <div className="dashboard-title">
          <FiActivity />
          <span>System Monitor</span>
        </div>
        <div className="dashboard-actions">
          <button className="action-btn" title="Refresh">
            <FiRefreshCw />
          </button>
          <button className="action-btn" title="Settings">
            <FiSettings />
          </button>
          <button className="action-btn" onClick={onToggle} title="Toggle Dashboard">
            {isVisible ? <FiEyeOff /> : <FiEye />}
          </button>
        </div>
      </div>

      <div className="dashboard-tabs">
        <button 
          className={`tab-btn ${selectedTab === 'overview' ? 'active' : ''}`}
          onClick={() => setSelectedTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab-btn ${selectedTab === 'logs' ? 'active' : ''}`}
          onClick={() => setSelectedTab('logs')}
        >
          Execution Logs
        </button>
        <button 
          className={`tab-btn ${selectedTab === 'health' ? 'active' : ''}`}
          onClick={() => setSelectedTab('health')}
        >
          System Health
        </button>
      </div>

      <div className="dashboard-content">
        {selectedTab === 'overview' && (
          <div className="overview-tab">
            <div className="metrics-grid">
              <MetricCard
                icon={<FiActivity />}
                title="Active Workflows"
                value={metrics.activeWorkflows}
                color="#3b82f6"
                trend={5}
              />
              <MetricCard
                icon={<FiCheckCircle />}
                title="Completed Today"
                value={metrics.completedToday}
                color="#10b981"
                trend={12}
              />
              <MetricCard
                icon={<FiAlertCircle />}
                title="Failed Today"
                value={metrics.failedToday}
                color="#ef4444"
                trend={-25}
              />
              <MetricCard
                icon={<FiClock />}
                title="Avg Execution"
                value={metrics.avgExecutionTime}
                unit="s"
                color="#f59e0b"
                trend={-8}
              />
              <MetricCard
                icon={<FiCpu />}
                title="CPU Usage"
                value={Math.round(metrics.cpuUsage)}
                unit="%"
                color="#8b5cf6"
              />
              <MetricCard
                icon={<FiDatabase />}
                title="Memory Usage"
                value={Math.round(metrics.memoryUsage)}
                unit="%"
                color="#ec4899"
              />
              <MetricCard
                icon={<FiZap />}
                title="API Requests"
                value={metrics.apiRequests}
                color="#06b6d4"
                trend={15}
              />
              <MetricCard
                icon={<FiUsers />}
                title="DB Connections"
                value={metrics.databaseConnections}
                color="#84cc16"
              />
            </div>

            <div className="recent-activity">
              <h3>Recent Activity</h3>
              <div className="activity-list">
                {executionLogs.slice(0, 5).map(log => (
                  <div key={log.id} className="activity-item">
                    <div className="activity-time">{log.timestamp}</div>
                    <div className="activity-node">{log.node}</div>
                    <div 
                      className="activity-status"
                      style={{ backgroundColor: getStatusColor(log.status) }}
                    >
                      {log.status}
                    </div>
                    <div className="activity-duration">{log.duration}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'logs' && (
          <div className="logs-tab">
            <div className="logs-header">
              <h3>Execution Logs</h3>
              <div className="logs-filters">
                <select defaultValue="all">
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="running">Running</option>
                  <option value="error">Error</option>
                </select>
                <input type="text" placeholder="Search logs..." />
              </div>
            </div>
            <div className="logs-list">
              {executionLogs.map(log => (
                <div key={log.id} className={`log-item ${log.status}`}>
                  <div className="log-timestamp">{log.timestamp}</div>
                  <div className="log-node">{log.node}</div>
                  <div className="log-message">{log.message}</div>
                  <div className="log-duration">{log.duration}</div>
                  <div 
                    className="log-status"
                    style={{ backgroundColor: getStatusColor(log.status) }}
                  >
                    {log.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedTab === 'health' && (
          <div className="health-tab">
            <div className="health-overview">
              <div className="health-summary">
                <h3>System Health</h3>
                <div className="overall-health">
                  <span>Overall Status:</span>
                  <div 
                    className="health-indicator-large"
                    style={{ backgroundColor: getHealthColor(systemHealth.overall) }}
                  >
                    {systemHealth.overall}
                  </div>
                </div>
              </div>
            </div>

            <div className="services-health">
              <h3>Service Status</h3>
              <div className="services-grid">
                {Object.entries(systemHealth.services).map(([service, data]) => (
                  <HealthIndicator key={service} service={service} data={data} />
                ))}
              </div>
            </div>

            <div className="performance-chart">
              <h3>Performance Trends</h3>
              <div className="chart-placeholder">
                <FiBarChart2 />
                <span>Performance visualization coming soon...</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MonitoringDashboard; 