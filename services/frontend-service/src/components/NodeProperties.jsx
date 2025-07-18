import React, { useState, useEffect } from 'react';
import { 
  FiCopy, 
  FiTrash2, 
  FiDownload, 
  FiPlay, 
  FiSettings, 
  FiEdit3, 
  FiCheck, 
  FiX,
  FiLayers
} from 'react-icons/fi';
import './NodeProperties.css';

// Simplified node type configurations
const nodeTypeConfigs = {
  start: {
    icon: '🚀',
    color: '#10b981',
    description: 'Entry point for the workflow execution.',
    category: 'Control Flow'
  },
  execute: {
    icon: '⚡',
    color: '#8b5cf6',
    description: 'AI-powered execution node for processing data.',
    category: 'AI Processing'
  },
  process: {
    icon: '⚙️',
    color: '#f59e0b',
    description: 'Data processing and transformation node.',
    category: 'Data Processing'
  },
  end: {
    icon: '🏁',
    color: '#ef4444',
    description: 'Terminal node that completes the workflow.',
    category: 'Control Flow'
  }
};

const NodeProperties = ({ node, onNodeDataChange }) => {
  const [formData, setFormData] = useState(node?.data || {});
  const [isEditing, setIsEditing] = useState(false);
  const [showAllFields, setShowAllFields] = useState(false);

  useEffect(() => {
    setFormData(node?.data || {});
    setIsEditing(false);
  }, [node]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onNodeDataChange(formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData(node?.data || {});
    setIsEditing(false);
  };

  const handleDuplicate = () => {
    console.log('Duplicate node:', node.id);
  };

  const handleDelete = () => {
    console.log('Delete node:', node.id);
  };

  const handleExport = () => {
    const nodeData = {
      id: node.id,
      type: node.type,
      data: formData,
      position: node.position
    };
    const blob = new Blob([JSON.stringify(nodeData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `node-${node.id}-config.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleTestNode = () => {
    console.log('Test node:', node.id);
  };

  if (!node) {
    return (
      <div className="wf-node-panel">
        <div className="wf-empty-selection">
          <div className="wf-empty-icon">
            <FiLayers size={48} />
          </div>
          <h3>Select a Node</h3>
          <p>Click on any node to view and edit its properties.</p>
        </div>
      </div>
    );
  }

  const config = nodeTypeConfigs[node.type] || nodeTypeConfigs.process;

  return (
    <div className="wf-node-panel">
      {/* Node Header */}
      <div className="wf-node-header">
        <div className="wf-node-title">
          <div className="wf-node-icon" style={{ background: `${config.color}20`, color: config.color }}>
            {config.icon}
          </div>
          <div className="wf-node-info">
            <h3>{formData.label || `${node.type} Node`}</h3>
            <span className="wf-node-type" style={{ background: config.color }}>
              {config.category}
            </span>
          </div>
        </div>
        <div className="wf-node-actions">
          <button className="wf-action-btn" onClick={handleTestNode} title="Test">
            <FiPlay />
          </button>
          <button className="wf-action-btn" onClick={handleDuplicate} title="Duplicate">
            <FiCopy />
          </button>
          <button className="wf-action-btn danger" onClick={handleDelete} title="Delete">
            <FiTrash2 />
          </button>
        </div>
      </div>

      {/* Simple Content */}
      <div className="wf-node-content">
        <div className="wf-node-description">
          <p>{config.description}</p>
        </div>

        {/* Key Properties */}
        <div className="wf-properties-section">
          <h4>Properties</h4>
          <div className="wf-properties-list">
            <div className="wf-property-item">
              <span className="wf-property-label">Type</span>
              <span className="wf-property-value">{node.type}</span>
            </div>
            <div className="wf-property-item">
              <span className="wf-property-label">Status</span>
              <span className="wf-property-value">{formData.status || 'idle'}</span>
            </div>
            <div className="wf-property-item">
              <span className="wf-property-label">ID</span>
              <span className="wf-property-value code">{node.id}</span>
            </div>
          </div>
        </div>

        {/* Node Label */}
        <div className="wf-config-section">
          <h4>Configuration</h4>
          
          <div className="wf-config-field">
            <label className="wf-field-label">Node Label</label>
            <input
              name="label"
              className="wf-node-input"
              type="text"
              value={formData.label || ''}
              onChange={handleInputChange}
              placeholder="Enter node label..."
            />
          </div>

          <div className="wf-config-field">
            <label className="wf-field-label">Description</label>
            <textarea
              name="description"
              className="wf-node-textarea"
              value={formData.description || ''}
              onChange={handleInputChange}
              placeholder="Enter node description..."
              rows={3}
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="wf-actions-section">
          <button className="wf-primary-btn" onClick={() => setIsEditing(true)}>
            <FiEdit3 /> Edit
          </button>
          <button className="wf-secondary-btn" onClick={handleExport}>
            <FiDownload /> Export
          </button>
        </div>
      </div>
    </div>
  );
};

export default NodeProperties; 