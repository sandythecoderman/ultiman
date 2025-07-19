import React, { useState } from 'react';
import { 
  FiPlus, FiPlay, FiSettings, FiServer, FiCheckCircle,
  FiGrid, FiDownload, FiMaximize, FiMinimize, FiX
} from 'react-icons/fi';
import './FloatingToolbar.css';

const FloatingToolbar = ({ 
  onAddNode, 
  onShowTemplates, 
  onAutoLayout, 
  onExport, 
  onTogglePresentation,
  isPresentationMode 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTool, setActiveTool] = useState(null);

  const nodeTypes = [
    {
      type: 'start',
      icon: <FiPlay />,
      label: 'Start',
      color: '#10b981'
    },
    {
      type: 'process',
      icon: <FiSettings />,
      label: 'Process',
      color: '#3b82f6'
    },
    {
      type: 'execute',
      icon: <FiServer />,
      label: 'Execute',
      color: '#f59e0b'
    },
    {
      type: 'end',
      icon: <FiCheckCircle />,
      label: 'End',
      color: '#ef4444'
    }
  ];

  const handleAddNode = (nodeType) => {
    const newNode = {
      id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: nodeType.type,
      position: { x: 200, y: 200 },
      data: { 
        label: `${nodeType.label} Node`,
        description: `Add ${nodeType.label.toLowerCase()} functionality`,
        status: 'pending'
      }
    };
    onAddNode(newNode);
    setActiveTool(null);
  };

  const handleToolClick = (tool) => {
    setActiveTool(activeTool === tool ? null : tool);
  };

  return (
    <div className="floating-toolbar">
      {/* Main Action Button */}
      <button 
        className={`toolbar-main-button ${isExpanded ? 'expanded' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
        title={isExpanded ? 'Close toolbar' : 'Add nodes'}
      >
        <FiPlus />
      </button>

      {/* Node Type Buttons */}
      {isExpanded && (
        <div className="toolbar-node-types">
          {nodeTypes.map((nodeType, index) => (
            <button
              key={nodeType.type}
              className="toolbar-node-button"
              style={{ 
                '--delay': `${index * 0.1}s`,
                '--color': nodeType.color 
              }}
              onClick={() => handleAddNode(nodeType)}
              title={`Add ${nodeType.label} node`}
            >
              <div className="node-button-icon" style={{ color: nodeType.color }}>
                {nodeType.icon}
              </div>
              <span className="node-button-label">{nodeType.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="toolbar-quick-actions">
        <button
          className={`toolbar-action-button ${activeTool === 'templates' ? 'active' : ''}`}
          onClick={() => {
            handleToolClick('templates');
            onShowTemplates();
          }}
          title="Workflow templates"
        >
          <FiGrid />
        </button>

        <button
          className={`toolbar-action-button ${activeTool === 'layout' ? 'active' : ''}`}
          onClick={() => {
            handleToolClick('layout');
            onAutoLayout();
          }}
          title="Auto layout"
        >
          <FiSettings />
        </button>

        <button
          className={`toolbar-action-button ${activeTool === 'export' ? 'active' : ''}`}
          onClick={() => {
            handleToolClick('export');
            onExport();
          }}
          title="Export workflow"
        >
          <FiDownload />
        </button>

        <button
          className={`toolbar-action-button ${activeTool === 'presentation' ? 'active' : ''}`}
          onClick={() => {
            handleToolClick('presentation');
            onTogglePresentation();
          }}
          title={isPresentationMode ? 'Exit presentation' : 'Presentation mode'}
        >
          {isPresentationMode ? <FiMinimize /> : <FiMaximize />}
        </button>
      </div>

      {/* Tooltip for active tool */}
      {activeTool && (
        <div className="toolbar-tooltip">
          {activeTool === 'templates' && 'Templates'}
          {activeTool === 'layout' && 'Auto Layout'}
          {activeTool === 'export' && 'Export'}
          {activeTool === 'presentation' && (isPresentationMode ? 'Exit Presentation' : 'Presentation Mode')}
        </div>
      )}
    </div>
  );
};

export default FloatingToolbar; 