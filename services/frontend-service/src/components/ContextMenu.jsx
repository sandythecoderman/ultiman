import React, { useEffect, useRef } from 'react';
import { 
  FiPlus, 
  FiCopy, 
  FiTrash2, 
  FiEdit3, 
  FiLink, 
  FiSettings, 
  FiPlay,
  FiDownload,
  FiZap,
  FiCode,
  FiLayers
} from 'react-icons/fi';
import './ContextMenu.css';

const ContextMenu = ({ 
  x, 
  y, 
  visible, 
  onClose, 
  type = 'canvas', // 'canvas', 'node', 'edge'
  nodeData = null,
  onAction 
}) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (visible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [visible, onClose]);

  if (!visible) return null;

  const handleAction = (action, data = {}) => {
    onAction(action, { ...data, nodeData });
    onClose();
  };

  const canvasMenuItems = [
    {
      id: 'create-start',
      label: 'Add Start Node',
      icon: <FiPlay />,
      action: () => handleAction('create-node', { type: 'start' }),
      shortcut: '1'
    },
    {
      id: 'create-execute',
      label: 'Add AI Execute Node',
      icon: <FiZap />,
      action: () => handleAction('create-node', { type: 'execute' }),
      shortcut: '2'
    },
    {
      id: 'create-process',
      label: 'Add Process Node',
      icon: <FiCode />,
      action: () => handleAction('create-node', { type: 'process' }),
      shortcut: '3'
    },
    {
      id: 'create-end',
      label: 'Add End Node',
      icon: <FiLayers />,
      action: () => handleAction('create-node', { type: 'end' }),
      shortcut: '4'
    },
    { type: 'divider' },
    {
      id: 'auto-layout',
      label: 'Auto Layout',
      icon: <FiSettings />,
      action: () => handleAction('auto-layout'),
      shortcut: 'Shift+L'
    },
    {
      id: 'export-image',
      label: 'Export as Image',
      icon: <FiDownload />,
      action: () => handleAction('export-image'),
      shortcut: 'Ctrl+E'
    }
  ];

  const nodeMenuItems = [
    {
      id: 'edit',
      label: 'Edit Node',
      icon: <FiEdit3 />,
      action: () => handleAction('edit-node'),
      shortcut: 'Enter'
    },
    {
      id: 'duplicate',
      label: 'Duplicate',
      icon: <FiCopy />,
      action: () => handleAction('duplicate-node'),
      shortcut: 'Ctrl+D'
    },
    {
      id: 'connect',
      label: 'Quick Connect',
      icon: <FiLink />,
      action: () => handleAction('quick-connect'),
      shortcut: 'C'
    },
    { type: 'divider' },
    {
      id: 'test',
      label: 'Test Node',
      icon: <FiPlay />,
      action: () => handleAction('test-node'),
      shortcut: 'T'
    },
    {
      id: 'export-config',
      label: 'Export Config',
      icon: <FiDownload />,
      action: () => handleAction('export-config'),
      shortcut: 'Ctrl+S'
    },
    { type: 'divider' },
    {
      id: 'delete',
      label: 'Delete',
      icon: <FiTrash2 />,
      action: () => handleAction('delete-node'),
      shortcut: 'Del',
      danger: true
    }
  ];

  const menuItems = type === 'node' ? nodeMenuItems : canvasMenuItems;

  // Adjust position to keep menu in viewport
  const adjustedPosition = {
    left: Math.min(x, window.innerWidth - 200),
    top: Math.min(y, window.innerHeight - (menuItems.length * 40))
  };

  return (
    <div 
      ref={menuRef}
      className="wf-context-menu"
      style={adjustedPosition}
      onClick={(e) => e.stopPropagation()}
    >
      {menuItems.map((item, index) => {
        if (item.type === 'divider') {
          return <div key={index} className="wf-context-divider" />;
        }

        return (
          <button
            key={item.id}
            className={`wf-context-item ${item.danger ? 'danger' : ''}`}
            onClick={item.action}
          >
            <span className="wf-context-icon">{item.icon}</span>
            <span className="wf-context-label">{item.label}</span>
            {item.shortcut && (
              <span className="wf-context-shortcut">{item.shortcut}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default ContextMenu; 