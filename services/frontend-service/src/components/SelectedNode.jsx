import React from 'react';

const SelectedNode = ({ node }) => {
  if (!node) {
    return <div className="selected-node-placeholder">Select a node to see details</div>;
  }

  // Assuming node data structure from reactflow
  const { id, data, type } = node;

  return (
    <div className="selected-node-details">
      <div className="detail-item">
        <strong>Level:</strong> <span>{data.level || 'N/A'}</span>
      </div>
      <div className="detail-item">
        <strong>ID:</strong> <span>{id}</span>
      </div>
      <div className="detail-item">
        <strong>Type:</strong> <span>{type || data.type || 'Unknown'}</span>
      </div>
    </div>
  );
};

export default SelectedNode; 