import React, { useState } from 'react';
import { FiBarChart2, FiTrendingUp, FiAlertCircle, FiCheckCircle, FiDownload, FiRefreshCw, FiShare2, FiX } from 'react-icons/fi';
import './AnalysisResults.css';

const AnalysisResults = ({ analysis, onClear }) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    // Simulate export process
    setTimeout(() => {
      setIsExporting(false);
      console.log('Analysis exported');
    }, 2000);
  };

  const handleReanalyze = () => {
    console.log('Re-running analysis...');
    // Implement re-analysis functionality
  };

  const handleShare = () => {
    console.log('Sharing analysis...');
    // Implement share functionality
  };

  // Mock analysis data for demonstration
  const mockAnalysis = {
    score: 85,
    status: 'good',
    metrics: {
      nodes: 8,
      connections: 12,
      complexity: 'Medium',
      efficiency: '92%'
    },
    suggestions: [
      {
        type: 'optimization',
        title: 'Reduce Node Complexity',
        description: 'Consider splitting the data processing node into smaller, more focused components.',
        priority: 'medium'
      },
      {
        type: 'performance',
        title: 'Add Error Handling',
        description: 'Include error handling nodes to improve workflow reliability.',
        priority: 'high'
      },
      {
        type: 'best-practice',
        title: 'Add Logging',
        description: 'Add logging nodes to track workflow execution and debugging.',
        priority: 'low'
      }
    ],
    performance: {
      estimatedTime: '2.3s',
      memoryUsage: '45MB',
      apiCalls: 3
    }
  };

  const currentAnalysis = analysis || mockAnalysis;

  const getStatusIcon = (status) => {
    switch (status) {
      case 'good': return <FiCheckCircle className="status-icon good" />;
      case 'warning': return <FiAlertCircle className="status-icon warning" />;
      case 'error': return <FiAlertCircle className="status-icon error" />;
      default: return <FiBarChart2 className="status-icon" />;
    }
  };

  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'high': return 'priority-high';
      case 'medium': return 'priority-medium';
      case 'low': return 'priority-low';
      default: return '';
    }
  };

  return (
    <div className="analysis-results">
      {/* Header */}
      <div className="analysis-header">
        <div className="analysis-title">
          <FiBarChart2 size={20} />
          <h3>Workflow Analysis</h3>
        </div>
        <div className="analysis-actions">
          <button className="icon-btn" onClick={handleReanalyze} title="Re-analyze">
            <FiRefreshCw />
          </button>
          <button className="icon-btn" onClick={handleShare} title="Share">
            <FiShare2 />
          </button>
          <button 
            className="icon-btn export-btn" 
            onClick={handleExport} 
            disabled={isExporting}
            title="Export"
          >
            {isExporting ? <FiRefreshCw className="spinning" /> : <FiDownload />}
          </button>
          <button className="icon-btn close-btn" onClick={onClear} title="Close">
            <FiX />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="analysis-content">
        {/* Overview Score */}
        <div className="analysis-section">
          <div className="score-container">
            <div className="score-circle">
              <div className="score-value">{currentAnalysis.score}</div>
              <div className="score-label">Score</div>
            </div>
            <div className="score-details">
              {getStatusIcon(currentAnalysis.status)}
              <div>
                <h4>Overall Health</h4>
                <p>Your workflow is performing well with minor optimization opportunities.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="analysis-section">
          <h4>Workflow Metrics</h4>
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-value">{currentAnalysis.metrics.nodes}</div>
              <div className="metric-label">Nodes</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">{currentAnalysis.metrics.connections}</div>
              <div className="metric-label">Connections</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">{currentAnalysis.metrics.complexity}</div>
              <div className="metric-label">Complexity</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">{currentAnalysis.metrics.efficiency}</div>
              <div className="metric-label">Efficiency</div>
            </div>
          </div>
        </div>

        {/* Performance */}
        <div className="analysis-section">
          <h4>Performance Estimates</h4>
          <div className="performance-stats">
            <div className="perf-item">
              <span className="perf-label">Estimated Runtime:</span>
              <span className="perf-value">{currentAnalysis.performance.estimatedTime}</span>
            </div>
            <div className="perf-item">
              <span className="perf-label">Memory Usage:</span>
              <span className="perf-value">{currentAnalysis.performance.memoryUsage}</span>
            </div>
            <div className="perf-item">
              <span className="perf-label">API Calls:</span>
              <span className="perf-value">{currentAnalysis.performance.apiCalls}</span>
            </div>
          </div>
        </div>

        {/* Suggestions */}
        <div className="analysis-section">
          <h4>Optimization Suggestions</h4>
          <div className="suggestions-list">
            {currentAnalysis.suggestions.map((suggestion, index) => (
              <div key={index} className={`suggestion-item ${getPriorityClass(suggestion.priority)}`}>
                <div className="suggestion-header">
                  <div className="suggestion-type">
                    <FiTrendingUp size={16} />
                    <span>{suggestion.title}</span>
                  </div>
                  <div className={`priority-badge ${suggestion.priority}`}>
                    {suggestion.priority}
                  </div>
                </div>
                <p className="suggestion-description">{suggestion.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="analysis-section">
          <div className="analysis-footer">
            <button className="action-btn primary">
              <FiCheckCircle />
              Apply Suggestions
            </button>
            <button className="action-btn secondary" onClick={handleExport}>
              <FiDownload />
              Export Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisResults; 