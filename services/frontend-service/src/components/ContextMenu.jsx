import React from 'react';
import { 
  FiEdit3, 
  FiCopy, 
  FiTrash2, 
  FiClipboard, 
  FiSettings, 
  FiRefreshCw, 
  FiLink, 
  FiInfo, 
  FiPlay, 
  FiZap, 
  FiHelpCircle, 
  FiCheck, 
  FiTarget, 
  FiPackage, 
  FiX, 
  FiGrid, 
  FiDownload, 
  FiUpload, 
  FiMove
} from 'react-icons/fi';
import './ContextMenu.css';

const ContextMenu = ({ 
  x, 
  y, 
  onClose, 
  onAction, 
  nodeId = null, 
  nodeType = null,
  isCanvas = false 
}) => {
  const handleAction = (action) => {
    onAction(action, nodeId);
    onClose();
  };

  const nodeActions = [
    { id: 'edit', label: 'Edit Node', icon: <FiEdit3 /> },
    { id: 'duplicate', label: 'Duplicate', icon: <FiCopy /> },
    { id: 'delete', label: 'Delete', icon: <FiTrash2 />, danger: true },
    { id: 'copy', label: 'Copy', icon: <FiClipboard /> },
    { id: 'parameters', label: 'Parameters', icon: <FiSettings /> },
    { id: 'status', label: 'Change Status', icon: <FiRefreshCw /> },
    { id: 'connect', label: 'Connect To...', icon: <FiLink /> },
    { id: 'details', label: 'View Details', icon: <FiInfo /> }
  ];

  const canvasActions = [
    { id: 'add-start', label: 'Add Start Node', icon: <FiPlay /> },
    { id: 'add-execute', label: 'Add Execute Node', icon: <FiZap /> },
    { id: 'add-process', label: 'Add Process Node', icon: <FiRefreshCw /> },
    { id: 'add-decision', label: 'Add Decision Node', icon: <FiHelpCircle /> },
    { id: 'add-end', label: 'Add End Node', icon: <FiCheck /> },
    { id: 'add-custom', label: 'Add Custom Node', icon: <FiTarget /> },
    { id: 'paste', label: 'Paste', icon: <FiClipboard /> },
    { id: 'select-all', label: 'Select All', icon: <FiPackage /> },
    { id: 'clear', label: 'Clear Canvas', icon: <FiTrash2 />, danger: true },
    { id: 'arrange', label: 'Auto Arrange', icon: <FiGrid /> },
    { id: 'export', label: 'Export Workflow', icon: <FiDownload /> },
    { id: 'import', label: 'Import Workflow', icon: <FiUpload /> }
  ];

  const actions = isCanvas ? canvasActions : nodeActions;

  return (
    <div 
      className="context-menu"
      style={{ 
        position: 'fixed', 
        left: x, 
        top: y,
        zIndex: 1000
      }}
    >
      <div className="context-menu-header">
        <span className="context-menu-title">
          {isCanvas ? 'Canvas Actions' : `${nodeType || 'Node'} Actions`}
        </span>
        <button className="context-menu-close" onClick={onClose}>
          <FiX />
        </button>
      </div>
      
      <div className="context-menu-content">
        {actions.map((action) => (
          <button
            key={action.id}
            className="context-menu-item"
            data-danger={action.danger || false}
            onClick={() => handleAction(action.id)}
          >
            <span className="context-menu-icon">{action.icon}</span>
            <span className="context-menu-label">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ContextMenu; 