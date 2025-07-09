import React from 'react';

const NodeStatistics = ({ nodes }) => {
  const totalNodes = nodes.length;

  const typeNameMapping = {
    'Platform': 'Platform',
    'CoreModule': 'Core Modules',
    'SubModuleService': 'Sub-modules & Services',
    'ApiEndpoint': 'API Endpoints',
  };

  const typeCounts = nodes.reduce((acc, node) => {
    const type = node.data?.type || 'Unknown';
    const displayName = typeNameMapping[type] || type;
    acc[displayName] = (acc[displayName] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="node-statistics">
      <div className="stat-item">
        <span>All Nodes</span>
        <span>{totalNodes} Nodes</span>
      </div>
      {Object.entries(typeCounts).map(([type, count]) => (
        <div key={type} className="stat-item">
          <span>{type}</span>
          <span>{count} Nodes</span>
        </div>
      ))}
    </div>
  );
};

export default NodeStatistics; 