import React from 'react';
import { Handle, Position } from 'reactflow';
import './CustomNode.css';

const CustomNode = ({ data }) => {
  return (
    <div className="custom-node">
      <Handle type="target" position={Position.Top} className="custom-handle" />
      <div className="node-content">
        <span className="node-label">{data.label}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="custom-handle" />
    </div>
  );
};

export default CustomNode; 