import React from 'react';
import { Handle, Position } from 'reactflow';
import './CustomNode.css';

const typeConfig = {
  start: { icon: '🚀', color: '#10b981' },
  execute: { icon: '⚡', color: '#8b5cf6' },
  process: { icon: '⚙️', color: '#f59e0b' },
  end: { icon: '🏁', color: '#ef4444' },
  default: { icon: '🔲', color: '#64748b' },
};

const statusColors = {
  idle: '#64748b',
  running: '#f59e0b',
  completed: '#10b981',
  error: '#ef4444',
  pending: '#8b5cf6',
};

const CustomNode = ({ data, type }) => {
  const config = typeConfig[type] || typeConfig.default;
  const statusColor = statusColors[data.status] || statusColors.idle;

  return (
    <div className="custom-node enhanced">
      <Handle type="target" position={Position.Top} className="custom-handle" />
      <div className="node-visuals">
        <span className="node-type-icon" style={{ background: config.color + '22', color: config.color }}>{config.icon}</span>
        <div className="node-content">
          <span className="node-label">{data.label}</span>
          {data.description && <span className="node-desc">{data.description}</span>}
        </div>
        <span className="node-status-badge" style={{ background: statusColor }} title={data.status || 'idle'}></span>
      </div>
      <Handle type="source" position={Position.Bottom} className="custom-handle" />
    </div>
  );
};

export default CustomNode; 