import React, { useState, useEffect } from 'react';
import { 
  FiCopy, 
  FiTrash2, 
  FiDownload, 
  FiPlay, 
  FiSettings, 
  FiInfo, 
  FiEdit3, 
  FiCheck, 
  FiX,
  FiLink,
  FiActivity,
  FiClock,
  FiUser,
  FiCode,
  FiLayers,
  FiZap,
  FiDatabase
} from 'react-icons/fi';
import './NodeProperties.css';

// Node type configurations with detailed descriptions
const nodeTypeConfigs = {
  start: {
    icon: '🚀',
    color: '#10b981',
    description: 'Entry point for the workflow. Defines how and when the workflow begins execution.',
    category: 'Control Flow',
    fields: {
      trigger: { 
        type: 'select', 
        label: 'Trigger Type', 
        options: ['Manual', 'Scheduled', 'Webhook', 'File Upload', 'API Call'], 
        description: 'Define how this workflow is initiated',
        required: true
      },
      schedule: {
        type: 'text',
        label: 'Schedule (for Scheduled trigger)',
        description: 'Cron expression or time interval',
        dependency: 'trigger',
        dependencyValue: 'Scheduled'
      }
    }
  },
  execute: {
    icon: '⚡',
    color: '#8b5cf6',
    description: 'AI-powered execution node that processes data using language models and prompts.',
    category: 'AI Processing',
    fields: {
      prompt: { 
        type: 'textarea', 
        label: 'AI Prompt Template', 
        description: 'Define the AI prompt for this execution step. Use {{variable}} for dynamic content.',
        required: true,
        placeholder: 'Enter your AI prompt here...'
      },
      model: {
        type: 'select',
        label: 'AI Model',
        options: ['GPT-4', 'GPT-3.5-turbo', 'Claude-3', 'Llama-2'],
        description: 'Select the AI model to use for processing',
        required: true
      },
      temperature: {
        type: 'range',
        label: 'Temperature',
        min: 0,
        max: 1,
        step: 0.1,
        description: 'Controls randomness in AI responses (0 = deterministic, 1 = creative)'
      }
    }
  },
  process: {
    icon: '⚙️',
    color: '#f59e0b',
    description: 'Data processing node that transforms, filters, or manipulates data using custom scripts.',
    category: 'Data Processing',
    fields: {
      script: { 
        type: 'textarea', 
        label: 'Processing Script', 
        description: 'JavaScript code to process the data. Input data is available as "input" variable.',
        required: true,
        placeholder: 'return input.map(item => ({ ...item, processed: true }));'
      },
      timeout: {
        type: 'number',
        label: 'Timeout (seconds)',
        description: 'Maximum execution time for the script',
        default: 30
      }
    }
  },
  end: {
    icon: '🏁',
    color: '#ef4444',
    description: 'Terminal node that defines the final output format and completes the workflow.',
    category: 'Control Flow',
    fields: {
      output: { 
        type: 'textarea', 
        label: 'Output Format', 
        description: 'Define the final output structure using JSON or template format',
        required: true,
        placeholder: '{"result": "{{data}}", "timestamp": "{{now}}"}'
      },
      format: {
        type: 'select',
        label: 'Output Format Type',
        options: ['JSON', 'Text', 'HTML', 'CSV', 'XML'],
        description: 'Select the format for the output data'
      }
    }
  }
};

const NodeProperties = ({ node, onNodeDataChange }) => {
  const [formData, setFormData] = useState(node?.data || {});
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

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
    // Implement duplicate functionality
  };

  const handleDelete = () => {
    console.log('Delete node:', node.id);
    // Implement delete functionality
  };

  const handleExport = () => {
    const nodeData = {
      id: node.id,
      type: node.type,
      data: formData,
      position: node.position,
      config: nodeTypeConfigs[node.type] || {}
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
    // Implement test functionality
  };

  if (!node) {
    return (
      <div className="wf-node-panel">
        <div className="wf-empty-selection">
          <div className="wf-empty-icon">
            <FiLayers size={48} />
          </div>
          <h3>No Node Selected</h3>
          <p>Click on any node in the workflow to view its detailed properties, configuration, and connections.</p>
          <div className="wf-empty-suggestions">
            <p>💡 <strong>Tip:</strong> You can also right-click on nodes for quick actions</p>
          </div>
        </div>
      </div>
    );
  }

  const config = nodeTypeConfigs[node.type] || nodeTypeConfigs.process;
  
  // Mock connections data (in real app, this would come from edges)
  const mockConnections = {
    incoming: [
      { nodeId: 'node-1', label: 'User Input', type: 'start' },
      { nodeId: 'node-2', label: 'Data Processor', type: 'process' }
    ],
    outgoing: [
      { nodeId: 'node-4', label: 'Email Sender', type: 'execute' },
      { nodeId: 'node-5', label: 'Final Output', type: 'end' }
    ]
  };

  // Mock activity data
  const mockActivity = [
    { time: '2 mins ago', action: 'Configuration updated', user: 'You' },
    { time: '1 hour ago', action: 'Node created', user: 'You' },
    { time: '2 hours ago', action: 'Last execution completed', user: 'System' }
  ];

  const getNodeTypeIcon = (type) => {
    const icons = {
      start: <FiPlay />,
      execute: <FiZap />,
      process: <FiCode />,
      end: <FiCheck />,
      default: <FiLayers />
    };
    return icons[type] || icons.default;
  };

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
            <div className="wf-node-meta">
              <span className="wf-node-type" style={{ background: config.color }}>
                {config.category}
              </span>
              <span className="wf-node-id">#{node.id}</span>
            </div>
          </div>
        </div>
        <div className="wf-node-actions">
          <button className="wf-action-btn" onClick={handleTestNode} title="Test Node">
            <FiPlay />
          </button>
          <button className="wf-action-btn" onClick={handleDuplicate} title="Duplicate">
            <FiCopy />
          </button>
          <button className="wf-action-btn" onClick={handleExport} title="Export">
            <FiDownload />
          </button>
          <button className="wf-action-btn danger" onClick={handleDelete} title="Delete">
            <FiTrash2 />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="wf-node-tabs">
        <button 
          className={`wf-tab ${activeTab === 'details' ? 'active' : ''}`}
          onClick={() => setActiveTab('details')}
        >
          <FiInfo size={16} />
          Details
        </button>
        <button 
          className={`wf-tab ${activeTab === 'connections' ? 'active' : ''}`}
          onClick={() => setActiveTab('connections')}
        >
          <FiLink size={16} />
          Connections
        </button>
        <button 
          className={`wf-tab ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          <FiActivity size={16} />
          Activity
        </button>
      </div>

      {/* Tab Content */}
      <div className="wf-tab-content">
        {activeTab === 'details' && (
          <>
            {/* Description */}
            <div className="wf-detail-section">
              <h4>Node Description</h4>
              <p>{config.description}</p>
            </div>

            {/* Basic Properties */}
            <div className="wf-detail-section">
              <h4>Basic Properties</h4>
              <div className="wf-properties-list">
                <div className="wf-property-item">
                  <span className="wf-property-label">Node Type</span>
                  <span className="wf-property-value">{node.type}</span>
                </div>
                <div className="wf-property-item">
                  <span className="wf-property-label">Category</span>
                  <span className="wf-property-value">{config.category}</span>
                </div>
                <div className="wf-property-item">
                  <span className="wf-property-label">Node ID</span>
                  <span className="wf-property-value code">{node.id}</span>
                </div>
                <div className="wf-property-item">
                  <span className="wf-property-label">Position</span>
                  <span className="wf-property-value">
                    x: {Math.round(node.position.x)}, y: {Math.round(node.position.y)}
                  </span>
                </div>
              </div>
            </div>

            {/* Node Label */}
            <div className="wf-detail-section">
              <h4>Node Label</h4>
              <div className="wf-input-group">
        <input
          name="label"
                  className="wf-node-input"
          type="text"
          value={formData.label || ''}
          onChange={handleInputChange}
                  placeholder="Enter node label..."
                />
                <div className="wf-edit-controls">
                  <button className="wf-save-btn" onClick={handleSave}>
                    <FiCheck />
                  </button>
                  <button className="wf-cancel-btn" onClick={handleCancel}>
                    <FiX />
                  </button>
                </div>
              </div>
      </div>

            {/* Configuration Fields */}
            {Object.keys(config.fields || {}).length > 0 && (
              <div className="wf-detail-section">
                <h4>Configuration</h4>
                {Object.entries(config.fields).map(([key, field]) => {
                  // Check dependency
                  if (field.dependency && formData[field.dependency] !== field.dependencyValue) {
                    return null;
                  }

                  return (
                    <div key={key} className="wf-config-field">
                      <label className="wf-field-label">
                        {field.label}
                        {field.required && <span className="wf-required">*</span>}
                      </label>
                      {field.description && (
                        <p className="wf-field-description">{field.description}</p>
                      )}
                      
                      {field.type === 'select' ? (
                        <select
                          name={key}
                          className="wf-node-select"
                          value={formData[key] || ''}
                          onChange={handleInputChange}
                        >
                          <option value="">Select {field.label.toLowerCase()}...</option>
                          {field.options?.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      ) : field.type === 'textarea' ? (
          <textarea
            name={key}
                          className="wf-node-textarea"
            value={formData[key] || ''}
            onChange={handleInputChange}
                          placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
            rows={4}
          />
                      ) : field.type === 'range' ? (
                        <div className="wf-range-field">
                          <input
                            type="range"
                            name={key}
                            className="wf-node-range"
                            min={field.min}
                            max={field.max}
                            step={field.step}
                            value={formData[key] || field.default || field.min}
                            onChange={handleInputChange}
                          />
                          <span className="wf-range-value">
                            {formData[key] || field.default || field.min}
                          </span>
                        </div>
                      ) : (
                        <input
                          name={key}
                          className="wf-node-input"
                          type={field.type || 'text'}
                          value={formData[key] || ''}
                          onChange={handleInputChange}
                          placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {activeTab === 'connections' && (
          <>
            <div className="wf-detail-section">
              <h4>Incoming Connections</h4>
              {mockConnections.incoming.length > 0 ? (
                <div className="wf-connections-list">
                  {mockConnections.incoming.map((conn, index) => (
                    <div key={index} className="wf-connection-item">
                      <div className="wf-connection-icon">
                        {getNodeTypeIcon(conn.type)}
                      </div>
                      <div className="wf-connection-info">
                        <div className="wf-connection-name">{conn.label}</div>
                        <div className="wf-connection-type">{conn.type} node</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="wf-no-connections">
                  <FiLink />
                  <span>No incoming connections</span>
                </div>
              )}
            </div>

            <div className="wf-detail-section">
              <h4>Outgoing Connections</h4>
              {mockConnections.outgoing.length > 0 ? (
                <div className="wf-connections-list">
                  {mockConnections.outgoing.map((conn, index) => (
                    <div key={index} className="wf-connection-item">
                      <div className="wf-connection-icon">
                        {getNodeTypeIcon(conn.type)}
                      </div>
                      <div className="wf-connection-info">
                        <div className="wf-connection-name">{conn.label}</div>
                        <div className="wf-connection-type">{conn.type} node</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="wf-no-connections">
                  <FiLink />
                  <span>No outgoing connections</span>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'activity' && (
          <div className="wf-detail-section">
            <h4>Recent Activity</h4>
            <div className="wf-activity-list">
              {mockActivity.map((activity, index) => (
                <div key={index} className="wf-activity-item">
                  <div className="wf-activity-time">
                    <FiClock size={12} />
                    {activity.time}
                  </div>
                  <div className="wf-activity-content">
                    <div className="wf-activity-action">{activity.action}</div>
                    <div className="wf-activity-user">by {activity.user}</div>
                  </div>
        </div>
      ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NodeProperties; 