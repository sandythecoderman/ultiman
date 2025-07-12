import React, { useState } from 'react';
import { 
  FiPlay, 
  FiZap, 
  FiCode, 
  FiLayers, 
  FiChevronDown,
  FiChevronUp,
  FiPlus,
  FiMail,
  FiDatabase,
  FiGlobe,
  FiFileText,
  FiShoppingCart
} from 'react-icons/fi';
import './NodeTemplates.css';

const workflowTemplates = [
  {
    id: 'email-processing',
    name: 'Email Processing',
    description: 'Automated email processing and response workflow',
    icon: <FiMail />,
    color: '#06b6d4',
    nodes: [
      {
        id: 'email-start',
        type: 'start',
        position: { x: 50, y: 50 },
        data: { label: 'Email Received' }
      },
      {
        id: 'email-analyze',
        type: 'execute',
        position: { x: 300, y: 50 },
        data: { label: 'Analyze Content' }
      },
      {
        id: 'email-categorize',
        type: 'process',
        position: { x: 550, y: 50 },
        data: { label: 'Categorize Email' }
      },
      {
        id: 'email-respond',
        type: 'execute',
        position: { x: 300, y: 200 },
        data: { label: 'Generate Response' }
      },
      {
        id: 'email-end',
        type: 'end',
        position: { x: 550, y: 200 },
        data: { label: 'Send Response' }
      }
    ],
    edges: [
      { id: 'e1', source: 'email-start', target: 'email-analyze' },
      { id: 'e2', source: 'email-analyze', target: 'email-categorize' },
      { id: 'e3', source: 'email-categorize', target: 'email-respond' },
      { id: 'e4', source: 'email-respond', target: 'email-end' }
    ]
  },
  {
    id: 'data-analysis',
    name: 'Data Analysis Pipeline',
    description: 'Complete data processing and analysis workflow',
    icon: <FiDatabase />,
    color: '#10b981',
    nodes: [
      {
        id: 'data-start',
        type: 'start',
        position: { x: 50, y: 50 },
        data: { label: 'Data Input' }
      },
      {
        id: 'data-clean',
        type: 'process',
        position: { x: 300, y: 50 },
        data: { label: 'Clean Data' }
      },
      {
        id: 'data-analyze',
        type: 'execute',
        position: { x: 550, y: 50 },
        data: { label: 'AI Analysis' }
      },
      {
        id: 'data-visualize',
        type: 'process',
        position: { x: 300, y: 200 },
        data: { label: 'Create Visualizations' }
      },
      {
        id: 'data-report',
        type: 'end',
        position: { x: 550, y: 200 },
        data: { label: 'Generate Report' }
      }
    ],
    edges: [
      { id: 'e1', source: 'data-start', target: 'data-clean' },
      { id: 'e2', source: 'data-clean', target: 'data-analyze' },
      { id: 'e3', source: 'data-analyze', target: 'data-visualize' },
      { id: 'e4', source: 'data-visualize', target: 'data-report' }
    ]
  },
  {
    id: 'content-creation',
    name: 'Content Creation',
    description: 'Automated content generation and publishing',
    icon: <FiFileText />,
    color: '#8b5cf6',
    nodes: [
      {
        id: 'content-start',
        type: 'start',
        position: { x: 50, y: 50 },
        data: { label: 'Topic Input' }
      },
      {
        id: 'content-research',
        type: 'execute',
        position: { x: 300, y: 50 },
        data: { label: 'Research Topic' }
      },
      {
        id: 'content-write',
        type: 'execute',
        position: { x: 550, y: 50 },
        data: { label: 'Generate Content' }
      },
      {
        id: 'content-review',
        type: 'process',
        position: { x: 300, y: 200 },
        data: { label: 'Review & Edit' }
      },
      {
        id: 'content-publish',
        type: 'end',
        position: { x: 550, y: 200 },
        data: { label: 'Publish Content' }
      }
    ],
    edges: [
      { id: 'e1', source: 'content-start', target: 'content-research' },
      { id: 'e2', source: 'content-research', target: 'content-write' },
      { id: 'e3', source: 'content-write', target: 'content-review' },
      { id: 'e4', source: 'content-review', target: 'content-publish' }
    ]
  },
  {
    id: 'web-scraping',
    name: 'Web Scraping & Analysis',
    description: 'Extract and analyze data from websites',
    icon: <FiGlobe />,
    color: '#f59e0b',
    nodes: [
      {
        id: 'scrape-start',
        type: 'start',
        position: { x: 50, y: 50 },
        data: { label: 'Target URLs' }
      },
      {
        id: 'scrape-extract',
        type: 'process',
        position: { x: 300, y: 50 },
        data: { label: 'Extract Data' }
      },
      {
        id: 'scrape-process',
        type: 'process',
        position: { x: 550, y: 50 },
        data: { label: 'Process Data' }
      },
      {
        id: 'scrape-analyze',
        type: 'execute',
        position: { x: 300, y: 200 },
        data: { label: 'AI Analysis' }
      },
      {
        id: 'scrape-export',
        type: 'end',
        position: { x: 550, y: 200 },
        data: { label: 'Export Results' }
      }
    ],
    edges: [
      { id: 'e1', source: 'scrape-start', target: 'scrape-extract' },
      { id: 'e2', source: 'scrape-extract', target: 'scrape-process' },
      { id: 'e3', source: 'scrape-process', target: 'scrape-analyze' },
      { id: 'e4', source: 'scrape-analyze', target: 'scrape-export' }
    ]
  }
];

const nodeTemplates = [
  {
    id: 'single-start',
    type: 'start',
    name: 'Start Node',
    description: 'Workflow entry point',
    icon: <FiPlay />,
    color: '#10b981'
  },
  {
    id: 'single-execute',
    type: 'execute',
    name: 'AI Execute',
    description: 'AI processing node',
    icon: <FiZap />,
    color: '#8b5cf6'
  },
  {
    id: 'single-process',
    type: 'process',
    name: 'Process Data',
    description: 'Data transformation',
    icon: <FiCode />,
    color: '#f59e0b'
  },
  {
    id: 'single-end',
    type: 'end',
    name: 'End Node',
    description: 'Workflow completion',
    icon: <FiLayers />,
    color: '#ef4444'
  }
];

const NodeTemplates = ({ visible, onClose, onCreateWorkflow, onCreateNode }) => {
  const [activeSection, setActiveSection] = useState('workflows');
  const [expandedWorkflow, setExpandedWorkflow] = useState(null);

  if (!visible) return null;

  const handleWorkflowCreate = (template) => {
    // Generate unique IDs for the nodes and edges
    const uniqueNodes = template.nodes.map(node => ({
      ...node,
      id: `${node.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }));

    const uniqueEdges = template.edges.map(edge => {
      const sourceNode = uniqueNodes.find(n => n.id.startsWith(edge.source));
      const targetNode = uniqueNodes.find(n => n.id.startsWith(edge.target));
      return {
        ...edge,
        id: `${edge.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        source: sourceNode?.id || edge.source,
        target: targetNode?.id || edge.target
      };
    });

    onCreateWorkflow({
      nodes: uniqueNodes,
      edges: uniqueEdges,
      template: template
    });
    onClose();
  };

  const handleNodeCreate = (template) => {
    const newNode = {
      id: `${template.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: template.type,
      position: { x: 200, y: 150 },
      data: { label: template.name }
    };
    
    onCreateNode(newNode);
    onClose();
  };

  return (
    <div className="wf-templates-overlay" onClick={onClose}>
      <div className="wf-templates-panel" onClick={(e) => e.stopPropagation()}>
        <div className="wf-templates-header">
          <h2>Workflow Templates</h2>
          <button className="wf-templates-close" onClick={onClose}>×</button>
        </div>

        <div className="wf-templates-tabs">
          <button 
            className={`wf-templates-tab ${activeSection === 'workflows' ? 'active' : ''}`}
            onClick={() => setActiveSection('workflows')}
          >
            Complete Workflows
          </button>
          <button 
            className={`wf-templates-tab ${activeSection === 'nodes' ? 'active' : ''}`}
            onClick={() => setActiveSection('nodes')}
          >
            Individual Nodes
          </button>
        </div>

        <div className="wf-templates-content">
          {activeSection === 'workflows' && (
            <div className="wf-templates-section">
              <h3>Pre-built Workflow Templates</h3>
              <p>Choose from common workflow patterns to get started quickly</p>
              
              <div className="wf-templates-list">
                {workflowTemplates.map((template) => (
                  <div key={template.id} className="wf-template-item">
                    <div 
                      className="wf-template-header"
                      onClick={() => setExpandedWorkflow(
                        expandedWorkflow === template.id ? null : template.id
                      )}
                    >
                      <div className="wf-template-info">
                        <div 
                          className="wf-template-icon" 
                          style={{ background: `${template.color}20`, color: template.color }}
                        >
                          {template.icon}
                        </div>
                        <div className="wf-template-details">
                          <h4>{template.name}</h4>
                          <p>{template.description}</p>
                          <span className="wf-template-meta">
                            {template.nodes.length} nodes • {template.edges.length} connections
                          </span>
                        </div>
                      </div>
                      <div className="wf-template-actions">
                        {expandedWorkflow === template.id ? <FiChevronUp /> : <FiChevronDown />}
                      </div>
                    </div>

                    {expandedWorkflow === template.id && (
                      <div className="wf-template-expanded">
                        <div className="wf-template-preview">
                          <h5>Workflow Steps:</h5>
                          <ol>
                            {template.nodes.map((node) => (
                              <li key={node.id}>{node.data.label}</li>
                            ))}
                          </ol>
                        </div>
                        <button 
                          className="wf-template-create-btn"
                          onClick={() => handleWorkflowCreate(template)}
                        >
                          <FiPlus />
                          Create This Workflow
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'nodes' && (
            <div className="wf-templates-section">
              <h3>Individual Node Types</h3>
              <p>Add specific node types to build your custom workflow</p>
              
              <div className="wf-node-templates-grid">
                {nodeTemplates.map((template) => (
                  <div 
                    key={template.id} 
                    className="wf-node-template-item"
                    onClick={() => handleNodeCreate(template)}
                  >
                    <div 
                      className="wf-node-template-icon"
                      style={{ background: `${template.color}20`, color: template.color }}
                    >
                      {template.icon}
                    </div>
                    <div className="wf-node-template-info">
                      <h4>{template.name}</h4>
                      <p>{template.description}</p>
                    </div>
                    <button className="wf-node-template-add">
                      <FiPlus />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NodeTemplates; 