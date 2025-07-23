import React, { useState } from 'react';
import { 
  FiPlus, FiDownload, FiUpload, FiStar, FiEye, FiEdit3,
  FiTrash2, FiSearch, FiFilter, FiGrid, FiList, FiX
} from 'react-icons/fi';
import './WorkflowTemplates.css';

const WorkflowTemplates = ({ isVisible, onClose, onApplyTemplate }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const categories = [
    { id: 'all', name: 'All Templates', count: 24 },
    { id: 'data', name: 'Data Processing', count: 8 },
    { id: 'ml', name: 'Machine Learning', count: 6 },
    { id: 'api', name: 'API Integration', count: 5 },
    { id: 'automation', name: 'Automation', count: 3 },
    { id: 'analytics', name: 'Analytics', count: 2 }
  ];

  const templates = [
    {
      id: 1,
      name: 'Customer Data Pipeline',
      description: 'Complete pipeline for processing customer data from multiple sources',
      category: 'data',
      rating: 4.8,
      downloads: 1247,
      complexity: 'Intermediate',
      nodes: 12,
      estimatedTime: '15 min',
      tags: ['customer', 'data', 'pipeline', 'etl'],
      preview: {
        nodes: [
          { id: '1', type: 'input', label: 'Data Source', position: { x: 100, y: 100 } },
          { id: '2', type: 'process', label: 'Data Cleaner', position: { x: 300, y: 100 } },
          { id: '3', type: 'output', label: 'Database', position: { x: 500, y: 100 } }
        ],
        edges: [
          { id: 'e1-2', source: '1', target: '2' },
          { id: 'e2-3', source: '2', target: '3' }
        ]
      }
    },
    {
      id: 2,
      name: 'ML Model Training',
      description: 'Automated machine learning model training and evaluation workflow',
      category: 'ml',
      rating: 4.9,
      downloads: 892,
      complexity: 'Advanced',
      nodes: 18,
      estimatedTime: '25 min',
      tags: ['ml', 'training', 'model', 'evaluation'],
      preview: {
        nodes: [
          { id: '1', type: 'input', label: 'Training Data', position: { x: 100, y: 100 } },
          { id: '2', type: 'ml', label: 'Feature Engineering', position: { x: 300, y: 100 } },
          { id: '3', type: 'ml', label: 'Model Training', position: { x: 500, y: 100 } },
          { id: '4', type: 'output', label: 'Model Registry', position: { x: 700, y: 100 } }
        ],
        edges: [
          { id: 'e1-2', source: '1', target: '2' },
          { id: 'e2-3', source: '2', target: '3' },
          { id: 'e3-4', source: '3', target: '4' }
        ]
      }
    },
    {
      id: 3,
      name: 'API Integration Hub',
      description: 'Centralized hub for integrating multiple external APIs',
      category: 'api',
      rating: 4.6,
      downloads: 567,
      complexity: 'Intermediate',
      nodes: 15,
      estimatedTime: '20 min',
      tags: ['api', 'integration', 'hub', 'external'],
      preview: {
        nodes: [
          { id: '1', type: 'api', label: 'API Gateway', position: { x: 100, y: 100 } },
          { id: '2', type: 'process', label: 'Data Transformer', position: { x: 300, y: 100 } },
          { id: '3', type: 'output', label: 'Unified Output', position: { x: 500, y: 100 } }
        ],
        edges: [
          { id: 'e1-2', source: '1', target: '2' },
          { id: 'e2-3', source: '2', target: '3' }
        ]
      }
    },
    {
      id: 4,
      name: 'Email Automation',
      description: 'Automated email processing and response system',
      category: 'automation',
      rating: 4.7,
      downloads: 734,
      complexity: 'Beginner',
      nodes: 8,
      estimatedTime: '10 min',
      tags: ['email', 'automation', 'response', 'processing'],
      preview: {
        nodes: [
          { id: '1', type: 'input', label: 'Email Inbox', position: { x: 100, y: 100 } },
          { id: '2', type: 'process', label: 'Email Analyzer', position: { x: 300, y: 100 } },
          { id: '3', type: 'output', label: 'Response Generator', position: { x: 500, y: 100 } }
        ],
        edges: [
          { id: 'e1-2', source: '1', target: '2' },
          { id: 'e2-3', source: '2', target: '3' }
        ]
      }
    },
    {
      id: 5,
      name: 'Real-time Analytics',
      description: 'Real-time data analytics and dashboard generation',
      category: 'analytics',
      rating: 4.5,
      downloads: 445,
      complexity: 'Advanced',
      nodes: 20,
      estimatedTime: '30 min',
      tags: ['analytics', 'real-time', 'dashboard', 'monitoring'],
      preview: {
        nodes: [
          { id: '1', type: 'input', label: 'Data Stream', position: { x: 100, y: 100 } },
          { id: '2', type: 'process', label: 'Stream Processor', position: { x: 300, y: 100 } },
          { id: '3', type: 'output', label: 'Dashboard', position: { x: 500, y: 100 } }
        ],
        edges: [
          { id: 'e1-2', source: '1', target: '2' },
          { id: 'e2-3', source: '2', target: '3' }
        ]
      }
    },
    {
      id: 6,
      name: 'Data Quality Check',
      description: 'Comprehensive data quality validation and cleaning workflow',
      category: 'data',
      rating: 4.4,
      downloads: 623,
      complexity: 'Intermediate',
      nodes: 14,
      estimatedTime: '18 min',
      tags: ['data', 'quality', 'validation', 'cleaning'],
      preview: {
        nodes: [
          { id: '1', type: 'input', label: 'Raw Data', position: { x: 100, y: 100 } },
          { id: '2', type: 'process', label: 'Quality Checker', position: { x: 300, y: 100 } },
          { id: '3', type: 'output', label: 'Clean Data', position: { x: 500, y: 100 } }
        ],
        edges: [
          { id: 'e1-2', source: '1', target: '2' },
          { id: 'e2-3', source: '2', target: '3' }
        ]
      }
    }
  ];

  const filteredTemplates = templates.filter(template => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleApplyTemplate = (template) => {
    onApplyTemplate(template.preview);
    onClose();
  };

  const handlePreviewTemplate = (template) => {
    setSelectedTemplate(template);
  };

  const getComplexityColor = (complexity) => {
    switch (complexity) {
      case 'Beginner': return '#10b981';
      case 'Intermediate': return '#f59e0b';
      case 'Advanced': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const TemplateCard = ({ template }) => (
    <div className="template-card">
      <div className="template-header">
        <div className="template-info">
          <h3 className="template-name">{template.name}</h3>
          <p className="template-description">{template.description}</p>
        </div>
        <div className="template-rating">
          <FiStar className="star-icon" />
          <span>{template.rating}</span>
        </div>
      </div>

      <div className="template-meta">
        <div className="meta-item">
          <span className="meta-label">Complexity:</span>
          <span 
            className="meta-value complexity"
            style={{ color: getComplexityColor(template.complexity) }}
          >
            {template.complexity}
          </span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Nodes:</span>
          <span className="meta-value">{template.nodes}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Time:</span>
          <span className="meta-value">{template.estimatedTime}</span>
        </div>
      </div>

      <div className="template-tags">
        {template.tags.slice(0, 3).map(tag => (
          <span key={tag} className="tag">{tag}</span>
        ))}
        {template.tags.length > 3 && (
          <span className="tag more">+{template.tags.length - 3}</span>
        )}
      </div>

      <div className="template-stats">
        <span className="downloads">{template.downloads} downloads</span>
      </div>

      <div className="template-actions">
        <button 
          className="action-btn preview"
          onClick={() => handlePreviewTemplate(template)}
        >
          <FiEye />
          Preview
        </button>
        <button 
          className="action-btn apply"
          onClick={() => handleApplyTemplate(template)}
        >
          <FiPlus />
          Apply
        </button>
      </div>
    </div>
  );

  const TemplatePreview = ({ template, onClose }) => (
    <div className="template-preview-overlay">
      <div className="template-preview-modal">
        <div className="preview-header">
          <h2>{template.name}</h2>
          <button className="close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="preview-content">
          <div className="preview-info">
            <p className="preview-description">{template.description}</p>
            
            <div className="preview-meta">
              <div className="meta-row">
                <span>Category:</span>
                <span className="category-badge">{template.category}</span>
              </div>
              <div className="meta-row">
                <span>Complexity:</span>
                <span style={{ color: getComplexityColor(template.complexity) }}>
                  {template.complexity}
                </span>
              </div>
              <div className="meta-row">
                <span>Nodes:</span>
                <span>{template.nodes}</span>
              </div>
              <div className="meta-row">
                <span>Estimated Time:</span>
                <span>{template.estimatedTime}</span>
              </div>
            </div>

            <div className="preview-tags">
              {template.tags.map(tag => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>
          </div>

          <div className="preview-workflow">
            <h3>Workflow Preview</h3>
            <div className="workflow-preview">
              {/* This would be a mini ReactFlow canvas showing the template */}
              <div className="preview-placeholder">
                <div className="preview-nodes">
                  {template.preview.nodes.map(node => (
                    <div 
                      key={node.id}
                      className={`preview-node ${node.type}`}
                      style={{ 
                        left: node.position.x / 10, 
                        top: node.position.y / 10 
                      }}
                    >
                      {node.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="preview-actions">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="btn-primary"
            onClick={() => handleApplyTemplate(template)}
          >
            Apply Template
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className={`workflow-templates ${isVisible ? 'visible' : ''}`}>
        <div className="templates-header">
          <div className="header-content">
            <h2>Workflow Templates</h2>
            <p>Choose from pre-built templates or create your own</p>
          </div>
          <button className="close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="templates-controls">
          <div className="search-filter">
            <div className="search-box">
              <FiSearch />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="view-toggle">
              <button 
                className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                <FiGrid />
              </button>
              <button 
                className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
              >
                <FiList />
              </button>
            </div>
          </div>

          <div className="category-filter">
            {categories.map(category => (
              <button
                key={category.id}
                className={`category-btn ${selectedCategory === category.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.name}
                <span className="category-count">({category.count})</span>
              </button>
            ))}
          </div>
        </div>

        <div className="templates-content">
          <div className={`templates-grid ${viewMode}`}>
            {filteredTemplates.map(template => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="no-results">
              <p>No templates found matching your criteria.</p>
              <button onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}>
                Clear filters
              </button>
            </div>
          )}
        </div>

        <div className="templates-footer">
          <button className="btn-secondary">
            <FiUpload />
            Import Template
          </button>
          <button className="btn-primary">
            <FiPlus />
            Create Custom Template
          </button>
        </div>
      </div>

      {selectedTemplate && (
        <TemplatePreview 
          template={selectedTemplate} 
          onClose={() => setSelectedTemplate(null)} 
        />
      )}
    </>
  );
};

export default WorkflowTemplates; 