import React from 'react';
import { Handle, Position } from 'reactflow';
import './CustomNode.css';

const CustomNode = ({ data, selected }) => {
  const getNodeTypeColor = (type) => {
    switch (type) {
      case 'start':
        return '#10b981'; // Green
      case 'process':
        return '#3b82f6'; // Blue
      case 'execute':
        return '#f59e0b'; // Orange
      case 'end':
        return '#ef4444'; // Red
      default:
        return '#6b7280'; // Gray
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return '#10b981';
      case 'running':
        return '#3b82f6';
      case 'pending':
        return '#f59e0b';
      case 'error':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'running':
        return '⟳';
      case 'pending':
        return '⏳';
      case 'error':
        return '✗';
      default:
        return '○';
    }
  };

  const nodeColor = getNodeTypeColor(data.type);
  const statusColor = getStatusColor(data.status);

  return (
    <div 
      className={`custom-node ${selected ? 'selected' : ''} ${data.status}`}
      style={{ 
        borderColor: nodeColor,
        boxShadow: selected ? `0 0 0 2px ${nodeColor}40` : 'none'
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="node-handle"
        style={{ background: nodeColor }}
      />
      
      <div className="node-header">
        <div className="node-type-indicator" style={{ backgroundColor: nodeColor }}>
          {data.type.charAt(0).toUpperCase()}
        </div>
        <div className="node-status" style={{ color: statusColor }}>
          {getStatusIcon(data.status)}
        </div>
      </div>
      
      <div className="node-content">
        <div className="node-label">{data.label}</div>
        {data.description && (
          <div className="node-description">{data.description}</div>
        )}
      </div>

      {data.status === 'running' && (
        <div className="node-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ backgroundColor: statusColor }}></div>
          </div>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="node-handle"
        style={{ background: nodeColor }}
      />
    </div>
  );
};

export default CustomNode; 