import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  MiniMap,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './KnowledgeBase.css';
import { 
  FiSearch, 
  FiFilter, 
  FiGrid, 
  FiList, 
  FiInfo, 
  FiLink, 
  FiActivity,
  FiPlus,
  FiDownload,
  FiShare2,
  FiRefreshCw,
  FiSettings,
  FiChevronDown,
  FiChevronRight,
  FiBookOpen,
  FiDatabase,
  FiLayers,
  FiZap
} from 'react-icons/fi';
import { KNOWLEDGE_GRAPH_ENDPOINT } from '../config';

// Knowledge categories with icons
const knowledgeCategories = [
  {
    id: 'architecture',
    name: 'Architecture Components',
    icon: <FiLayers />,
    color: '#8b5cf6',
    count: 12,
    expanded: true
  },
  {
    id: 'apis',
    name: 'API Endpoints',
    icon: <FiZap />,
    color: '#06b6d4',
    count: 24,
    expanded: true
  },
  {
    id: 'data',
    name: 'Data Models',
    icon: <FiDatabase />,
    color: '#10b981',
    count: 8,
    expanded: false
  },
  {
    id: 'services',
    name: 'Services & Tools',
    icon: <FiGrid />,
    color: '#f59e0b',
    count: 16,
    expanded: false
  },
  {
    id: 'docs',
    name: 'Documentation',
    icon: <FiBookOpen />,
    color: '#ef4444',
    count: 32,
    expanded: false
  }
];

const KnowledgeBase = () => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeTab, setActiveTab] = useState('details');
  const [viewMode, setViewMode] = useState('network'); // network, hierarchy, circular
  const [categories, setCategories] = useState(knowledgeCategories);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchGraphData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(KNOWLEDGE_GRAPH_ENDPOINT);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
      } catch (error) {
        console.error("Could not fetch graph data:", error);
        // Mock data for demonstration
        setNodes([
          { id: '1', position: { x: 100, y: 100 }, data: { label: 'User Service', category: 'architecture', description: 'Handles user authentication and management' } },
          { id: '2', position: { x: 300, y: 100 }, data: { label: 'Auth API', category: 'apis', description: 'REST API for authentication endpoints' } },
          { id: '3', position: { x: 200, y: 250 }, data: { label: 'User Model', category: 'data', description: 'Database schema for user data' } },
        ]);
        setEdges([
          { id: 'e1-2', source: '1', target: '2', label: 'uses' },
          { id: 'e1-3', source: '1', target: '3', label: 'manages' },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGraphData();
  }, []);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes],
  );
  
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges],
  );

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const onNodeClick = (event, node) => {
    setSelectedNode(node);
    setActiveTab('details'); // Switch to details tab when node is selected
  };

  // Filter nodes based on search and category
  const filteredNodes = nodes.filter(node => {
    const matchesSearch = node.data.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (node.data.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || node.data.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleCategory = (categoryId) => {
    setCategories(prev => prev.map(cat => 
      cat.id === categoryId ? { ...cat, expanded: !cat.expanded } : cat
    ));
  };

  const handleRefresh = () => {
    setIsLoading(true);
    // Simulate refresh
    setTimeout(() => setIsLoading(false), 1000);
  };

  const handleExport = () => {
    console.log('Exporting knowledge base...');
  };

  const getNodeStats = () => {
    return {
      total: nodes.length,
      selected: selectedNode ? 1 : 0,
      connections: edges.length,
      categories: new Set(nodes.map(n => n.data.category)).size
    };
  };

  const getRelatedNodes = (nodeId) => {
    const related = edges
      .filter(edge => edge.source === nodeId || edge.target === nodeId)
      .map(edge => edge.source === nodeId ? edge.target : edge.source);
    return nodes.filter(node => related.includes(node.id));
  };

  return (
    <div className="kb-page">
      {/* Enhanced Left Panel */}
      <div className="kb-left-panel">
        {/* Search Section */}
        <div className="kb-panel-section">
          <div className="kb-search-container">
            <div className="kb-search-wrapper">
              <FiSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search knowledge base..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="kb-search-input"
              />
            </div>
            <button className="kb-filter-btn" title="Advanced Filters">
              <FiFilter />
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="kb-panel-section">
          <div className="kb-stats-grid">
            <div className="kb-stat-item">
              <span className="kb-stat-value">{getNodeStats().total}</span>
              <span className="kb-stat-label">Nodes</span>
            </div>
            <div className="kb-stat-item">
              <span className="kb-stat-value">{getNodeStats().connections}</span>
              <span className="kb-stat-label">Links</span>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="kb-panel-section">
          <h3 className="kb-panel-title">Knowledge Categories</h3>
          <div className="kb-categories-list">
            <div 
              className={`kb-category-item ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              <div className="kb-category-info">
                <FiGrid className="kb-category-icon" />
                <span>All Categories</span>
              </div>
              <span className="kb-category-count">{nodes.length}</span>
            </div>
            
            {categories.map(category => (
              <div key={category.id} className="kb-category-group">
                <div 
                  className={`kb-category-item ${selectedCategory === category.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <div className="kb-category-info">
                    <button 
                      className="kb-category-toggle"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCategory(category.id);
                      }}
                    >
                      {category.expanded ? <FiChevronDown /> : <FiChevronRight />}
                    </button>
                    <span 
                      className="kb-category-icon" 
                      style={{ color: category.color }}
                    >
                      {category.icon}
                    </span>
                    <span>{category.name}</span>
                  </div>
                  <span className="kb-category-count">{category.count}</span>
                </div>
                
                {category.expanded && (
                  <div className="kb-subcategory-list">
                    {/* Subcategories would go here */}
                    <div className="kb-subcategory-item">
                      <span>• Core Components</span>
                    </div>
                    <div className="kb-subcategory-item">
                      <span>• External Services</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="kb-panel-section">
          <h3 className="kb-panel-title">Quick Actions</h3>
          <div className="kb-action-buttons">
            <button className="kb-action-btn primary">
              <FiPlus />
              Add Node
            </button>
            <button className="kb-action-btn secondary" onClick={handleExport}>
              <FiDownload />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Center Panel */}
      <div className="kb-center-panel">
        <div className="kb-graph-header">
          <div className="kb-graph-controls">
            <div className="kb-view-modes">
              <button 
                className={`kb-view-btn ${viewMode === 'network' ? 'active' : ''}`}
                onClick={() => setViewMode('network')}
                title="Network View"
              >
                <FiActivity />
              </button>
              <button 
                className={`kb-view-btn ${viewMode === 'hierarchy' ? 'active' : ''}`}
                onClick={() => setViewMode('hierarchy')}
                title="Hierarchy View"
              >
                <FiList />
              </button>
            </div>
            
            <div className="kb-graph-actions">
              <button className="kb-icon-btn" onClick={handleRefresh} title="Refresh">
                <FiRefreshCw className={isLoading ? 'spinning' : ''} />
              </button>
              <button className="kb-icon-btn" title="Share">
                <FiShare2 />
              </button>
              <button className="kb-icon-btn" title="Settings">
                <FiSettings />
              </button>
            </div>
          </div>
        </div>

        <div className="kb-graph-container">
          {isLoading ? (
            <div className="kb-loading-state">
              <FiRefreshCw className="spinning" size={32} />
              <p>Loading knowledge graph...</p>
            </div>
          ) : (
            <ReactFlow
              nodes={filteredNodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              fitView
              className="kb-react-flow"
            >
              <Background color="var(--border-color)" gap={16} size={1} />
              <Controls className="kb-controls" />
              <MiniMap 
                className="kb-minimap"
                nodeStrokeWidth={3}
                pannable
                zoomable
              />
            </ReactFlow>
          )}
        </div>
      </div>

      {/* Enhanced Right Panel */}
      <div className="kb-right-panel">
        {selectedNode ? (
          <>
            {/* Node Header */}
            <div className="kb-node-header">
              <div className="kb-node-title">
                <div className="kb-node-icon">
                  {categories.find(cat => cat.id === selectedNode.data.category)?.icon || <FiInfo />}
                </div>
                <div className="kb-node-info">
                  <h3>{selectedNode.data.label}</h3>
                  <span className="kb-node-type">
                    {categories.find(cat => cat.id === selectedNode.data.category)?.name || 'Unknown'}
                  </span>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="kb-tabs">
              <button 
                className={`kb-tab ${activeTab === 'details' ? 'active' : ''}`}
                onClick={() => setActiveTab('details')}
              >
                <FiInfo size={16} />
                Details
              </button>
              <button 
                className={`kb-tab ${activeTab === 'relationships' ? 'active' : ''}`}
                onClick={() => setActiveTab('relationships')}
              >
                <FiLink size={16} />
                Relations
              </button>
              <button 
                className={`kb-tab ${activeTab === 'activity' ? 'active' : ''}`}
                onClick={() => setActiveTab('activity')}
              >
                <FiActivity size={16} />
                Activity
              </button>
            </div>

            {/* Tab Content */}
            <div className="kb-tab-content">
              {activeTab === 'details' && (
                <div className="kb-details-content">
                  <div className="kb-detail-section">
                    <h4>Description</h4>
                    <p>{selectedNode.data.description || 'No description available.'}</p>
                  </div>
                  
                  <div className="kb-detail-section">
                    <h4>Properties</h4>
                    <div className="kb-properties-list">
                      <div className="kb-property-item">
                        <span className="kb-property-label">ID:</span>
                        <span className="kb-property-value">{selectedNode.id}</span>
                      </div>
                      <div className="kb-property-item">
                        <span className="kb-property-label">Type:</span>
                        <span className="kb-property-value">{selectedNode.data.category}</span>
                      </div>
                      <div className="kb-property-item">
                        <span className="kb-property-label">Connections:</span>
                        <span className="kb-property-value">{getRelatedNodes(selectedNode.id).length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'relationships' && (
                <div className="kb-relationships-content">
                  <div className="kb-detail-section">
                    <h4>Connected Nodes</h4>
                    <div className="kb-related-nodes">
                      {getRelatedNodes(selectedNode.id).map(node => (
                        <div key={node.id} className="kb-related-node">
                          <span className="kb-related-icon">
                            {categories.find(cat => cat.id === node.data.category)?.icon || <FiInfo />}
                          </span>
                          <div className="kb-related-info">
                            <span className="kb-related-name">{node.data.label}</span>
                            <span className="kb-related-type">{node.data.category}</span>
                          </div>
                        </div>
                      ))}
                      {getRelatedNodes(selectedNode.id).length === 0 && (
                        <p className="kb-no-relations">No connected nodes found.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="kb-activity-content">
                  <div className="kb-detail-section">
                    <h4>Recent Activity</h4>
                    <div className="kb-activity-list">
                      <div className="kb-activity-item">
                        <span className="kb-activity-time">2 hours ago</span>
                        <span className="kb-activity-text">Node was updated</span>
                      </div>
                      <div className="kb-activity-item">
                        <span className="kb-activity-time">1 day ago</span>
                        <span className="kb-activity-text">Connection added</span>
                      </div>
                      <div className="kb-activity-item">
                        <span className="kb-activity-time">3 days ago</span>
                        <span className="kb-activity-text">Node created</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="kb-empty-selection">
            <div className="kb-empty-icon">
              <FiInfo size={48} />
            </div>
            <h3>No Node Selected</h3>
            <p>Click on any node in the knowledge graph to view its details and relationships.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default KnowledgeBase; 