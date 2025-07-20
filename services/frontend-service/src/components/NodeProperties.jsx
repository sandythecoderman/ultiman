import React, { useState, useEffect } from 'react';
import { 
  FiSearch, 
  FiEdit3, 
  FiX, 
  FiPlay, 
  FiZap, 
  FiRefreshCw, 
  FiHelpCircle, 
  FiSquare, 
  FiSettings, 
  FiCheck, 
  FiClock, 
  FiPause, 
  FiPlus, 
  FiMinus,
  FiSave
} from 'react-icons/fi';
import './NodeProperties.css';

const NodeProperties = ({ selectedNode, onNodeUpdate }) => {
  const [parameters, setParameters] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [activeTab, setActiveTab] = useState('details'); // 'details', 'parameters', 'advanced'

  useEffect(() => {
    if (selectedNode) {
      setParameters(selectedNode.data.parameters || {});
      setEditData({
        label: selectedNode.data.label || '',
        description: selectedNode.data.description || '',
        icon: selectedNode.data.icon || <FiSettings />
      });
    }
  }, [selectedNode]);

  const handleParameterChange = (key, value) => {
    const newParameters = { ...parameters, [key]: value };
    setParameters(newParameters);
    
    if (onNodeUpdate && selectedNode) {
      onNodeUpdate(selectedNode.id, {
        ...selectedNode.data,
        parameters: newParameters
      });
    }
  };

  const handleEditSave = () => {
    if (onNodeUpdate && selectedNode) {
      onNodeUpdate(selectedNode.id, {
        ...selectedNode.data,
        ...editData
      });
    }
    setIsEditing(false);
  };

  const addParameter = () => {
    const newKey = `param_${Object.keys(parameters).length + 1}`;
    handleParameterChange(newKey, '');
  };

  const removeParameter = (key) => {
    const newParameters = { ...parameters };
    delete newParameters[key];
    setParameters(newParameters);
    
    if (onNodeUpdate && selectedNode) {
      onNodeUpdate(selectedNode.id, {
        ...selectedNode.data,
        parameters: newParameters
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'running': return '#3b82f6';
      case 'pending': return '#f59e0b';
      case 'failed': return '#ef4444';
      case 'idle': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <FiCheck />;
      case 'running': return <FiRefreshCw />;
      case 'pending': return <FiClock />;
      case 'failed': return <FiX />;
      case 'idle': return <FiPause />;
      default: return <FiHelpCircle />;
    }
  };

  const getNodeTypeInfo = (type) => {
    const typeInfo = {
      start: {
        name: 'Start Node',
        description: 'Entry point of the workflow',
        color: '#10b981',
        icon: <FiPlay />
      },
      execute: {
        name: 'Execute Node',
        description: 'Performs actions or operations',
        color: '#3b82f6',
        icon: <FiZap />
      },
      process: {
        name: 'Process Node',
        description: 'Processes data or information',
        color: '#8b5cf6',
        icon: <FiRefreshCw />
      },
      decision: {
        name: 'Decision Node',
        description: 'Makes decisions based on conditions',
        color: '#f59e0b',
        icon: <FiHelpCircle />
      },
      end: {
        name: 'End Node',
        description: 'Exit point of the workflow',
        color: '#ef4444',
        icon: <FiSquare />
      },
      custom: {
        name: 'Custom Node',
        description: 'User-defined node type',
        color: '#6b7280',
        icon: <FiSettings />
      }
    };
    return typeInfo[type] || typeInfo.custom;
  };

  if (!selectedNode) {
    return (
      <div className="node-properties">
        <div className="node-properties-header">
          <h3>Node Details</h3>
        </div>
        <div className="node-properties-empty">
          <div className="empty-icon">
            <FiSearch />
          </div>
          <h4>No Node Selected</h4>
          <p>Click on any node in the workflow to see its details and available actions.</p>
        </div>
      </div>
    );
  }

  const typeInfo = getNodeTypeInfo(selectedNode.type);

  return (
    <div className="node-properties">
      <div className="node-properties-header">
        <h3>Node Details</h3>
        <button 
          className="edit-button"
          onClick={() => setIsEditing(!isEditing)}
          title={isEditing ? 'Cancel Edit' : 'Edit Node'}
        >
          {isEditing ? <FiX /> : <FiEdit3 />}
        </button>
      </div>

      <div className="node-properties-content">
        {/* Node Type Badge */}
        <div className="node-type-badge" style={{ backgroundColor: typeInfo.color }}>
          <span className="type-icon">{typeInfo.icon}</span>
          <span className="type-name">{typeInfo.name}</span>
        </div>

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button 
            className={`tab-button ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            Details
          </button>
          <button 
            className={`tab-button ${activeTab === 'parameters' ? 'active' : ''}`}
            onClick={() => setActiveTab('parameters')}
          >
            Parameters
          </button>
          <button 
            className={`tab-button ${activeTab === 'advanced' ? 'active' : ''}`}
            onClick={() => setActiveTab('advanced')}
          >
            Advanced
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'details' && (
          <div className="tab-content">
            {/* Node Information */}
            <div className="node-info-section">
              <h4>Basic Information</h4>
              
              {isEditing ? (
                <div className="edit-form">
                  <div className="form-group">
                    <label>Label</label>
                    <input
                      type="text"
                      value={editData.label}
                      onChange={(e) => setEditData({...editData, label: e.target.value})}
                      placeholder="Enter node label"
                    />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      value={editData.description}
                      onChange={(e) => setEditData({...editData, description: e.target.value})}
                      placeholder="Enter node description"
                      rows="3"
                    />
                  </div>
                  <div className="form-group">
                    <label>Icon</label>
                    <input
                      type="text"
                      value={editData.icon}
                      onChange={(e) => setEditData({...editData, icon: e.target.value})}
                      placeholder="Enter icon"
                    />
                  </div>
                  <div className="edit-actions">
                    <button className="save-button" onClick={handleEditSave}>
                      <FiSave /> Save Changes
                    </button>
                    <button className="cancel-button" onClick={() => setIsEditing(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="info-display">
                  <div className="info-item">
                    <span className="info-label">Label</span>
                    <span className="info-value">{selectedNode.data.label}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Description</span>
                    <span className="info-value">{selectedNode.data.description}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Icon</span>
                    <span className="info-value">{selectedNode.data.icon}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Status Information */}
            <div className="node-info-section">
              <h4>Status</h4>
              <div className="status-display">
                <div 
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(selectedNode.data.status) }}
                >
                  <span className="status-icon">{getStatusIcon(selectedNode.data.status)}</span>
                  <span className="status-text">{selectedNode.data.status || 'idle'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'parameters' && (
          <div className="tab-content">
            <div className="node-info-section">
              <div className="section-header">
                <h4>Parameters</h4>
                <button className="add-parameter-button" onClick={addParameter}>
                  <FiPlus /> Add Parameter
                </button>
              </div>
              
              {Object.keys(parameters).length === 0 ? (
                <div className="no-parameters">
                  <div className="no-parameters-icon">
                    <FiSettings />
                  </div>
                  <p>No parameters configured</p>
                  <p className="hint">Add parameters to customize this node's behavior</p>
                </div>
              ) : (
                <div className="parameters-list">
                  {Object.entries(parameters).map(([key, value]) => (
                    <div key={key} className="parameter-item">
                      <div className="parameter-header">
                        <span className="parameter-label">Parameter</span>
                        <button 
                          className="remove-parameter-button"
                          onClick={() => removeParameter(key)}
                          title="Remove parameter"
                        >
                          <FiMinus />
                        </button>
                      </div>
                      <div className="parameter-inputs">
                        <div className="input-group">
                          <label>Name</label>
                          <input
                            type="text"
                            value={key}
                            onChange={(e) => {
                              const newParameters = { ...parameters };
                              delete newParameters[key];
                              newParameters[e.target.value] = value;
                              setParameters(newParameters);
                            }}
                            placeholder="Parameter name"
                            className="parameter-key"
                          />
                        </div>
                        <div className="input-group">
                          <label>Value</label>
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => handleParameterChange(key, e.target.value)}
                            placeholder="Parameter value"
                            className="parameter-value"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'advanced' && (
          <div className="tab-content">
            <div className="node-info-section">
              <h4>Technical Details</h4>
              <div className="info-display">
                <div className="info-item">
                  <span className="info-label">Node ID</span>
                  <span className="info-value code">{selectedNode.id}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Type</span>
                  <span className="info-value code">{selectedNode.type}</span>
                </div>
                {selectedNode.data.operation_id && (
                  <div className="info-item">
                    <span className="info-label">Operation ID</span>
                    <span className="info-value code">{selectedNode.data.operation_id}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="node-info-section">
              <h4>Position</h4>
              <div className="position-info">
                <div className="info-item">
                  <span className="info-label">X</span>
                  <span className="info-value">{Math.round(selectedNode.position.x)}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Y</span>
                  <span className="info-value">{Math.round(selectedNode.position.y)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NodeProperties; 