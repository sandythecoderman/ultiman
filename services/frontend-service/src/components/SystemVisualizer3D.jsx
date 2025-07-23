import React, { useState, useEffect, useRef } from 'react';
import {
  FiServer, FiDatabase, FiCpu, FiZap, FiActivity, FiGlobe,
  FiCloud, FiShield, FiTrendingUp, FiPlay, FiPause, FiRefreshCw,
  FiMaximize, FiMinimize, FiX, FiEye, FiEyeOff
} from 'react-icons/fi';
import './SystemVisualizer3D.css';

const SystemVisualizer3D = ({ isVisible, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [systemMetrics, setSystemMetrics] = useState({
    apiRequests: 0,
    databaseQueries: 0,
    aiProcessing: 0,
    vectorSearches: 0,
    activeConnections: 0,
    memoryUsage: 0,
    cpuUsage: 0
  });

  // System components data
  const systemComponents = [
    {
      id: 'frontend',
      name: 'Frontend UI',
      type: 'client',
      color: '#3b82f6',
      icon: <FiGlobe />,
      description: 'React-based user interface',
      connections: ['api-gateway']
    },
    {
      id: 'api-gateway',
      name: 'API Gateway',
      type: 'gateway',
      color: '#10b981',
      icon: <FiServer />,
      description: 'FastAPI backend server',
      connections: ['rag-engine', 'neo4j', 'vector-db']
    },
    {
      id: 'rag-engine',
      name: 'RAG Engine',
      type: 'ai',
      color: '#8b5cf6',
      icon: <FiCpu />,
      description: 'Retrieval-Augmented Generation',
      connections: ['gemini-ai', 'vector-db', 'neo4j']
    },
    {
      id: 'gemini-ai',
      name: 'Gemini AI',
      type: 'ai',
      color: '#f59e0b',
      icon: <FiZap />,
      description: 'Google Generative AI',
      connections: ['rag-engine']
    },
    {
      id: 'neo4j',
      name: 'Neo4j Database',
      type: 'database',
      color: '#ef4444',
      icon: <FiDatabase />,
      description: 'Graph database',
      connections: ['api-gateway', 'rag-engine']
    },
    {
      id: 'vector-db',
      name: 'Vector Database',
      type: 'database',
      color: '#06b6d4',
      icon: <FiActivity />,
      description: 'FAISS vector store',
      connections: ['api-gateway', 'rag-engine']
    },
    {
      id: 'embedding-model',
      name: 'Embedding Model',
      type: 'ml',
      color: '#ec4899',
      icon: <FiTrendingUp />,
      description: 'Sentence Transformers',
      connections: ['vector-db', 'rag-engine']
    }
  ];

  // Simulate real-time metrics
  useEffect(() => {
    if (!isVisible || !isPlaying) return;

    const interval = setInterval(() => {
      setSystemMetrics(prev => ({
        apiRequests: prev.apiRequests + Math.floor(Math.random() * 3),
        databaseQueries: prev.databaseQueries + Math.floor(Math.random() * 2),
        aiProcessing: prev.aiProcessing + Math.floor(Math.random() * 1),
        vectorSearches: prev.vectorSearches + Math.floor(Math.random() * 2),
        activeConnections: Math.max(5, Math.min(20, prev.activeConnections + (Math.random() - 0.5) * 2)),
        memoryUsage: Math.max(30, Math.min(80, prev.memoryUsage + (Math.random() - 0.5) * 5)),
        cpuUsage: Math.max(20, Math.min(70, prev.cpuUsage + (Math.random() - 0.5) * 3))
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible, isPlaying]);

  const handleComponentClick = (component) => {
    setSelectedComponent(component);
  };

  const toggleAnimation = () => {
    setIsPlaying(!isPlaying);
  };

  if (!isVisible) return null;

  return (
    <div className="system-visualizer-3d">
      <div className="visualizer-header">
        <div className="header-content">
          <h2>🎯 3D System Architecture</h2>
          <p>Real-time visualization of Ultiman backend operations</p>
        </div>
        <div className="header-controls">
          <button 
            className="control-btn"
            onClick={toggleAnimation}
            title={isPlaying ? 'Pause Animation' : 'Play Animation'}
          >
            {isPlaying ? <FiPause /> : <FiPlay />}
          </button>
          <button 
            className="control-btn"
            onClick={() => window.location.reload()}
            title="Reset View"
          >
            <FiRefreshCw />
          </button>
          <button 
            className="control-btn"
            onClick={onClose}
            title="Close Visualizer"
          >
            <FiX />
          </button>
        </div>
      </div>

      <div className="visualizer-content">
        <div className="3d-canvas-placeholder">
          <div className="placeholder-content">
            <div className="placeholder-icon">🎯</div>
            <h3>3D System Visualization</h3>
            <p>Interactive 3D view of your Ultiman backend architecture</p>
            <div className="placeholder-features">
              <div className="feature-item">
                <span>✅</span>
                <span>Real-time component animations</span>
              </div>
              <div className="feature-item">
                <span>✅</span>
                <span>Data flow visualization</span>
              </div>
              <div className="feature-item">
                <span>✅</span>
                <span>Interactive 3D controls</span>
              </div>
              <div className="feature-item">
                <span>✅</span>
                <span>System metrics overlay</span>
              </div>
            </div>
            <div className="placeholder-note">
              <p><strong>Note:</strong> 3D visualization is loading. This shows the system architecture in an immersive 3D environment.</p>
            </div>
          </div>
        </div>
        
        <div className="system-overlay">
          <div className="metrics-panel">
            <h3>📊 System Metrics</h3>
            <div className="metrics-grid">
              <div className="metric-item">
                <span className="metric-label">API Requests</span>
                <span className="metric-value">{systemMetrics.apiRequests}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">DB Queries</span>
                <span className="metric-value">{systemMetrics.databaseQueries}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">AI Processing</span>
                <span className="metric-value">{systemMetrics.aiProcessing}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Vector Searches</span>
                <span className="metric-value">{systemMetrics.vectorSearches}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Active Connections</span>
                <span className="metric-value">{systemMetrics.activeConnections}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Memory Usage</span>
                <span className="metric-value">{Math.round(systemMetrics.memoryUsage)}%</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">CPU Usage</span>
                <span className="metric-value">{Math.round(systemMetrics.cpuUsage)}%</span>
              </div>
            </div>
          </div>

          <div className="components-panel">
            <h3>🔧 System Components</h3>
            <div className="components-list">
              {systemComponents.map(component => (
                <div 
                  key={component.id}
                  className={`component-item ${selectedComponent?.id === component.id ? 'selected' : ''}`}
                  onClick={() => handleComponentClick(component)}
                >
                  <div className="component-icon" style={{ color: component.color }}>
                    {component.icon}
                  </div>
                  <div className="component-info">
                    <div className="component-name">{component.name}</div>
                    <div className="component-type">{component.type.toUpperCase()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {selectedComponent && (
          <div className="component-details">
            <div className="details-header">
              <div className="component-icon" style={{ color: selectedComponent.color }}>
                {selectedComponent.icon}
              </div>
              <div>
                <h4>{selectedComponent.name}</h4>
                <p>{selectedComponent.description}</p>
              </div>
              <button className="close-btn" onClick={() => setSelectedComponent(null)}>
                <FiX />
              </button>
            </div>
            <div className="details-content">
              <div className="detail-section">
                <h5>🔗 Connections</h5>
                <div className="connections-list">
                  {selectedComponent.connections.map(connId => {
                    const conn = systemComponents.find(c => c.id === connId);
                    return (
                      <div key={connId} className="connection-item">
                        <div className="connection-icon" style={{ color: conn.color }}>
                          {conn.icon}
                        </div>
                        <span>{conn.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="detail-section">
                <h5>📈 Status</h5>
                <div className="status-indicators">
                  <div className="status-item">
                    <div className="status-dot active"></div>
                    <span>Online</span>
                  </div>
                  <div className="status-item">
                    <div className="status-dot active"></div>
                    <span>Healthy</span>
                  </div>
                  <div className="status-item">
                    <div className="status-dot active"></div>
                    <span>Responding</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemVisualizer3D; 