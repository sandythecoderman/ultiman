import React, { useState } from 'react';
import './NodeTemplates.css';
import { 
  FiUsers, FiShield, FiServer, FiDatabase, FiSettings, 
  FiAlertTriangle, FiCheckCircle, FiClock, FiPlay, FiX,
  FiDownload, FiUpload, FiRefreshCw, FiMail, FiMonitor, FiPlus
} from 'react-icons/fi';

const NodeTemplates = ({ onClose, onCreateWorkflow, onCreateNode }) => {
  const [selectedCategory, setSelectedCategory] = useState('workflows');
  const [searchTerm, setSearchTerm] = useState('');

  const workflowTemplates = [
    {
      id: 'employee-onboarding',
      name: 'Employee Onboarding',
      description: 'Complete workflow for onboarding new employees including account creation, role assignment, and system access setup.',
      icon: <FiUsers />,
      category: 'HR',
      nodes: [
        {
          id: 'start-1',
          type: 'start',
          position: { x: 100, y: 100 },
          data: { 
            label: 'Start Onboarding',
            description: 'Initialize employee onboarding process',
            status: 'completed'
          }
        },
        {
          id: 'process-1',
          type: 'process',
          position: { x: 300, y: 100 },
          data: { 
            label: 'Validate Employee Data',
            description: 'Check employee information completeness',
            status: 'running'
          }
        },
        {
          id: 'execute-1',
          type: 'execute',
          position: { x: 500, y: 100 },
          data: { 
            label: 'Create User Account',
            description: 'Create user account in Infraon system',
            status: 'pending'
          }
        },
        {
          id: 'execute-2',
          type: 'execute',
          position: { x: 300, y: 250 },
          data: { 
            label: 'Assign Role',
            description: 'Assign appropriate role and permissions',
            status: 'pending'
          }
        },
        {
          id: 'execute-3',
          type: 'execute',
          position: { x: 500, y: 250 },
          data: { 
            label: 'Setup Monitoring',
            description: 'Configure device monitoring for employee',
            status: 'pending'
          }
        },
        {
          id: 'execute-4',
          type: 'execute',
          position: { x: 300, y: 400 },
          data: { 
            label: 'Send Welcome Email',
            description: 'Send welcome email with login credentials',
            status: 'pending'
          }
        },
        {
          id: 'end-1',
          type: 'end',
          position: { x: 500, y: 400 },
          data: { 
            label: 'Onboarding Complete',
            description: 'Employee onboarding completed successfully',
            status: 'pending'
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'start-1', target: 'process-1', type: 'smoothstep' },
        { id: 'e2', source: 'process-1', target: 'execute-1', type: 'smoothstep' },
        { id: 'e3', source: 'execute-1', target: 'execute-2', type: 'smoothstep' },
        { id: 'e4', source: 'execute-2', target: 'execute-3', type: 'smoothstep' },
        { id: 'e5', source: 'execute-3', target: 'execute-4', type: 'smoothstep' },
        { id: 'e6', source: 'execute-4', target: 'end-1', type: 'smoothstep' }
      ]
    },
    {
      id: 'incident-response',
      name: 'Incident Response',
      description: 'Automated incident response workflow for handling system alerts and outages.',
      icon: <FiAlertTriangle />,
      category: 'Operations',
      nodes: [
        {
          id: 'start-1',
          type: 'start',
          position: { x: 100, y: 100 },
          data: { 
            label: 'Alert Received',
            description: 'System alert triggered',
            status: 'completed'
          }
        },
        {
          id: 'process-1',
          type: 'process',
          position: { x: 300, y: 100 },
          data: { 
            label: 'Assess Severity',
            description: 'Evaluate incident severity level',
            status: 'running'
          }
        },
        {
          id: 'execute-1',
          type: 'execute',
          position: { x: 500, y: 100 },
          data: { 
            label: 'Create Incident Ticket',
            description: 'Create incident ticket in ITSM system',
            status: 'pending'
          }
        },
        {
          id: 'execute-2',
          type: 'execute',
          position: { x: 300, y: 250 },
          data: { 
            label: 'Notify Team',
            description: 'Send notifications to relevant teams',
            status: 'pending'
          }
        },
        {
          id: 'execute-3',
          type: 'execute',
          position: { x: 500, y: 250 },
          data: { 
            label: 'Update Status Page',
            description: 'Update public status page',
            status: 'pending'
          }
        },
        {
          id: 'end-1',
          type: 'end',
          position: { x: 400, y: 400 },
          data: { 
            label: 'Incident Handled',
            description: 'Initial response completed',
            status: 'pending'
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'start-1', target: 'process-1', type: 'smoothstep' },
        { id: 'e2', source: 'process-1', target: 'execute-1', type: 'smoothstep' },
        { id: 'e3', source: 'execute-1', target: 'execute-2', type: 'smoothstep' },
        { id: 'e4', source: 'execute-2', target: 'execute-3', type: 'smoothstep' },
        { id: 'e5', source: 'execute-3', target: 'end-1', type: 'smoothstep' }
      ]
    },
    {
      id: 'data-migration',
      name: 'Data Migration',
      description: 'Workflow for migrating data between systems with validation and rollback capabilities.',
      icon: <FiDatabase />,
      category: 'Data',
      nodes: [
        {
          id: 'start-1',
          type: 'start',
          position: { x: 100, y: 100 },
          data: { 
            label: 'Start Migration',
            description: 'Begin data migration process',
            status: 'completed'
          }
        },
        {
          id: 'process-1',
          type: 'process',
          position: { x: 300, y: 100 },
          data: { 
            label: 'Backup Data',
            description: 'Create backup before migration',
            status: 'running'
          }
        },
        {
          id: 'execute-1',
          type: 'execute',
          position: { x: 500, y: 100 },
          data: { 
            label: 'Migrate Data',
            description: 'Transfer data to target system',
            status: 'pending'
          }
        },
        {
          id: 'process-2',
          type: 'process',
          position: { x: 300, y: 250 },
          data: { 
            label: 'Validate Migration',
            description: 'Verify data integrity',
            status: 'pending'
          }
        },
        {
          id: 'execute-2',
          type: 'execute',
          position: { x: 500, y: 250 },
          data: { 
            label: 'Update References',
            description: 'Update system references',
            status: 'pending'
          }
        },
        {
          id: 'end-1',
          type: 'end',
          position: { x: 400, y: 400 },
          data: { 
            label: 'Migration Complete',
            description: 'Data migration completed successfully',
            status: 'pending'
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'start-1', target: 'process-1', type: 'smoothstep' },
        { id: 'e2', source: 'process-1', target: 'execute-1', type: 'smoothstep' },
        { id: 'e3', source: 'execute-1', target: 'process-2', type: 'smoothstep' },
        { id: 'e4', source: 'process-2', target: 'execute-2', type: 'smoothstep' },
        { id: 'e5', source: 'execute-2', target: 'end-1', type: 'smoothstep' }
      ]
    }
  ];

  const nodeTemplates = [
    {
      id: 'start',
      name: 'Start',
      description: 'Workflow entry point',
      icon: <FiPlay />,
      type: 'start',
      data: { 
        label: 'Start Process',
        description: 'Initialize the workflow',
        status: 'completed'
      }
    },
    {
      id: 'process',
      name: 'Process',
      description: 'Data processing or validation step',
      icon: <FiSettings />,
      type: 'process',
      data: { 
        label: 'Process Data',
        description: 'Process or validate data',
        status: 'pending'
      }
    },
    {
      id: 'execute',
      name: 'Execute',
      description: 'Execute external action or API call',
      icon: <FiServer />,
      type: 'execute',
      data: { 
        label: 'Execute Action',
        description: 'Execute external action',
        status: 'pending'
      }
    },
    {
      id: 'end',
      name: 'End',
      description: 'Workflow completion point',
      icon: <FiCheckCircle />,
      type: 'end',
      data: { 
        label: 'Complete',
        description: 'Workflow completed',
        status: 'pending'
      }
    }
  ];

  const filteredWorkflows = workflowTemplates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredNodes = nodeTemplates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateWorkflow = (template) => {
    onCreateWorkflow(template);
    onClose();
  };

  const handleCreateNode = (template) => {
    const newNode = {
      id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: template.type,
      position: { x: 200, y: 200 },
      data: template.data
    };
    onCreateNode(newNode);
    onClose();
  };

  return (
    <div className="node-templates-overlay">
      <div className="node-templates-modal">
        <div className="node-templates-header">
          <h2>Workflow Templates</h2>
          <button className="close-button" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="node-templates-search">
          <input
            type="text"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="node-templates-tabs">
          <button
            className={`tab-button ${selectedCategory === 'workflows' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('workflows')}
          >
            <FiPlay /> Workflows
          </button>
          <button
            className={`tab-button ${selectedCategory === 'nodes' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('nodes')}
          >
            <FiSettings /> Nodes
          </button>
        </div>

        <div className="node-templates-content">
          {selectedCategory === 'workflows' ? (
            <div className="workflow-templates">
              {filteredWorkflows.map((template) => (
                <div key={template.id} className="template-card workflow-template">
                  <div className="template-header">
                    <div className="template-icon">{template.icon}</div>
                    <div className="template-info">
                      <h3>{template.name}</h3>
                      <span className="template-category">{template.category}</span>
                    </div>
                  </div>
                  <p className="template-description">{template.description}</p>
                  <div className="template-stats">
                    <span>{template.nodes.length} nodes</span>
                    <span>{template.edges.length} connections</span>
                  </div>
                  <button
                    className="use-template-button"
                    onClick={() => handleCreateWorkflow(template)}
                  >
                    <FiPlay /> Use Template
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="node-templates-grid">
              {filteredNodes.map((template) => (
                <div key={template.id} className="template-card node-template">
                  <div className="template-icon">{template.icon}</div>
                  <h3>{template.name}</h3>
                  <p>{template.description}</p>
                  <button
                    className="add-node-button"
                    onClick={() => handleCreateNode(template)}
                  >
                    <FiPlus /> Add Node
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NodeTemplates; 