import React from 'react';

const NodeDescription = ({ node }) => {
  const description = node?.data?.description || 'No description available.';

  return (
    <div className="node-description">
      <p>{description}</p>
    </div>
  );
};

export default NodeDescription; 