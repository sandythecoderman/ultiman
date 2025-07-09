import React from 'react';

const nodeTypes = [
  { name: 'Platform', color: '#00A9FF', type: 'Platform' },
  { name: 'Core Modules', color: '#FF007F', type: 'CoreModule' },
  { name: 'Sub-modules & Services', color: '#FFA500', type: 'SubModuleService' },
  { name: 'API Endpoints', color: '#32CD32', type: 'ApiEndpoint' },
];

const NodeTypes = () => {
  return (
    <div className="node-types-legend">
      {nodeTypes.map((type) => (
        <div key={type.name} className="node-type-item">
          <div className="node-type-color" style={{ backgroundColor: type.color }} />
          <span>{type.name}</span>
        </div>
      ))}
    </div>
  );
};

export default NodeTypes; 