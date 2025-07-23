import React, { useState, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { 
  FiPlay, FiPause, FiCheck, FiX, FiAlertCircle, FiDatabase, 
  FiFileText, FiCpu, FiZap, FiSettings, FiEye, FiDownload,
  FiUpload, FiFilter, FiTrendingUp, FiClock, FiActivity
} from 'react-icons/fi';
import './EnhancedNode.css';

const EnhancedNode = ({ data, isConnectable, selected }) => {
  const [executionState, setExecutionState] = useState(data.executionState || 'idle');
  const [progress, setProgress] = useState(0);
  const [showDataPreview, setShowDataPreview] = useState(false);
  const [executionTime, setExecutionTime] = useState(0);
  const [dataQuality, setDataQuality] = useState(95);
  const [errorCount, setErrorCount] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  // Simulate execution states
  useEffect(() => {
    if (executionState === 'running') {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            setExecutionState('completed');
            setExecutionTime(prev => prev + 1);
            return 100;
          }
          return prev + Math.random() * 10;
        });
      }, 500);
      return () => clearInterval(interval);
    }
  }, [executionState]);

  const getNodeIcon = () => {
    switch (data.type) {
      case 'input': return <FiUpload />;
      case 'output': return <FiDownload />;
      case 'database': return <FiDatabase />;
      case 'api': return <FiZap />;
      case 'process': return <FiCpu />;
      case 'filter': return <FiFilter />;
      case 'ml': return <FiTrendingUp />;
      default: return <FiSettings />;
    }
  };

  const getExecutionColor = () => {
    switch (executionState) {
      case 'idle': return '#6b7280';
      case 'running': return '#3b82f6';
      case 'completed': return '#10b981';
      case 'error': return '#ef4444';
      case 'warning': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getExecutionIcon = () => {
    switch (executionState) {
      case 'idle': return <FiPlay />;
      case 'running': return <FiActivity />;
      case 'completed': return <FiCheck />;
      case 'error': return <FiX />;
      case 'warning': return <FiAlertCircle />;
      default: return <FiPlay />;
    }
  };

  const handleExecute = () => {
    setExecutionState('running');
    setProgress(0);
    setExecutionTime(0);
    setErrorCount(0);
  };

  const handleReset = () => {
    setExecutionState('idle');
    setProgress(0);
    setExecutionTime(0);
  };

  const toggleDataPreview = () => {
    setShowDataPreview(!showDataPreview);
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`enhanced-node ${executionState} ${selected ? 'selected' : ''} ${isExpanded ? 'expanded' : ''}`}>
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="node-handle"
      />

      {/* Main Node Content */}
      <div className="node-header">
        <div className="node-icon">
          {getNodeIcon()}
        </div>
        <div className="node-title">
          <span className="node-label">{data.label}</span>
          <span className="node-type">{data.type}</span>
        </div>
        <div className="node-actions">
          <button 
            className="action-btn"
            onClick={toggleDataPreview}
            title="Data Preview"
          >
            <FiEye />
          </button>
          <button 
            className="action-btn"
            onClick={toggleExpand}
            title="Expand"
          >
            <FiSettings />
          </button>
        </div>
      </div>

      {/* Execution Status */}
      <div className="execution-status">
        <div className="status-indicator" style={{ backgroundColor: getExecutionColor() }}>
          {getExecutionIcon()}
        </div>
        <div className="status-info">
          <span className="status-text">{executionState}</span>
          {executionState === 'running' && (
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="node-metrics">
        <div className="metric">
          <FiClock />
          <span>{executionTime}s</span>
        </div>
        <div className="metric">
          <FiTrendingUp />
          <span>{dataQuality}%</span>
        </div>
        {errorCount > 0 && (
          <div className="metric error">
            <FiAlertCircle />
            <span>{errorCount}</span>
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="node-controls">
        <button 
          className={`control-btn ${executionState === 'running' ? 'disabled' : ''}`}
          onClick={handleExecute}
          disabled={executionState === 'running'}
        >
          <FiPlay />
        </button>
        <button 
          className="control-btn"
          onClick={handleReset}
        >
          <FiPause />
        </button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="node-expanded">
          <div className="expanded-section">
            <h4>Configuration</h4>
            <div className="config-item">
              <label>Timeout:</label>
              <input type="number" defaultValue="30" />
            </div>
            <div className="config-item">
              <label>Retries:</label>
              <input type="number" defaultValue="3" />
            </div>
          </div>
          
          <div className="expanded-section">
            <h4>Data Schema</h4>
            <div className="schema-preview">
              <pre>{JSON.stringify(data.schema || {}, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}

      {/* Data Preview Panel */}
      {showDataPreview && (
        <div className="data-preview-panel">
          <div className="preview-header">
            <h4>Data Preview</h4>
            <button onClick={toggleDataPreview}>×</button>
          </div>
          <div className="preview-content">
            <div className="data-stats">
              <div className="stat">
                <span>Records:</span>
                <span>1,234</span>
              </div>
              <div className="stat">
                <span>Size:</span>
                <span>2.3 MB</span>
              </div>
              <div className="stat">
                <span>Quality:</span>
                <span>{dataQuality}%</span>
              </div>
            </div>
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>Column</th>
                    <th>Type</th>
                    <th>Sample</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>id</td>
                    <td>int</td>
                    <td>1, 2, 3...</td>
                  </tr>
                  <tr>
                    <td>name</td>
                    <td>string</td>
                    <td>John, Jane...</td>
                  </tr>
                  <tr>
                    <td>email</td>
                    <td>string</td>
                    <td>john@example.com</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        className="node-handle"
      />
    </div>
  );
};

export default EnhancedNode; 