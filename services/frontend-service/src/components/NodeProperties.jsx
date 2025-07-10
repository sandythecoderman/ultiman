import React, { useState, useEffect } from 'react';
import './NodeProperties.css';

const nodeConfigs = {
  execute: {
    prompt: { type: 'textarea', label: 'Prompt Template' },
  },
  process: {
    script: { type: 'textarea', label: 'Processing Script' },
  },
};

const NodeProperties = ({ node, onNodeDataChange }) => {
  const [formData, setFormData] = useState(node?.data || {});

  useEffect(() => {
    setFormData(node?.data || {});
  }, [node]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBlur = () => {
    onNodeDataChange(formData);
  };

  if (!node) {
    return (
      <div className="node-properties">
        <h3>Properties</h3>
        <p className="placeholder">Select a node to see its properties.</p>
      </div>
    );
  }

  const config = nodeConfigs[node.type];

  return (
    <div className="node-properties">
      <h3>Node Properties</h3>
      <div className="prop-item">
        <span className="prop-label">ID</span>
        <span className="prop-value">{node.id}</span>
      </div>
      <div className="prop-item">
        <span className="prop-label">Type</span>
        <span className="prop-value">{node.type}</span>
      </div>
      <div className="prop-item-editable">
        <label className="prop-label" htmlFor="node-label">Label</label>
        <input
          id="node-label"
          name="label"
          className="prop-input"
          type="text"
          value={formData.label || ''}
          onChange={handleInputChange}
          onBlur={handleBlur}
        />
      </div>

      {config && <hr className="prop-divider" />}

      {config && Object.entries(config).map(([key, field]) => (
        <div key={key} className="prop-item-editable">
          <label className="prop-label" htmlFor={`prop-${key}`}>{field.label}</label>
          <textarea
            id={`prop-${key}`}
            name={key}
            className="prop-textarea"
            value={formData[key] || ''}
            onChange={handleInputChange}
            onBlur={handleBlur}
            rows={4}
          />
        </div>
      ))}
    </div>
  );
};

export default NodeProperties; 