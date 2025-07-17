import React, { useState, useEffect, useMemo } from 'react';
import Neo4jGraph from '../components/Neo4jGraph';
import { 
  FiSearch, FiGrid, FiList, FiZoomIn, FiZoomOut, FiRefreshCw, 
  FiSettings, FiFilter, FiEye, FiLayers, FiDatabase 
} from 'react-icons/fi';
import './KnowledgeBase.css';
import mockGraphData from '../data/mockGraphData';

const KnowledgeBase = () => {
  // Core state
  const [graphData, setGraphData] = useState({ nodes: [], edges: [], relationships: [] });
  const [schemaInfo, setSchemaInfo] = useState({ labels: [], relationshipTypes: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI state
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewType, setViewType] = useState('graph'); // 'graph', 'table', 'tree'
  const [selectedNodeTypes, setSelectedNodeTypes] = useState(new Set());
  const [selectedRelTypes, setSelectedRelTypes] = useState(new Set());
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

  // Load mock data
  const loadMockData = () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('🔍 Loading mock graph data from infraon_ontology.json...');

      // Transform mock data for the existing UI components
      const transformedNodes = mockGraphData.allNodes.map(node => ({
        id: node.id,
        name: node.label,
        category: node.group,
        description: node.description || `${node.group} with ID ${node.id}`,
        properties: node.properties || {},
        labels: [node.group],
        radius: 30,
        isExpanded: false
      }));

      const transformedEdges = mockGraphData.allRelationships.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type,
        properties: {}
      }));

      const newGraphData = {
        nodes: transformedNodes,
        edges: transformedEdges,
        relationships: transformedEdges
      };

      // Extract unique labels and relationship types
      const uniqueLabels = [...new Set(transformedNodes.map(n => n.category))];
      const uniqueRelTypes = [...new Set(transformedEdges.map(e => e.type))];

      setGraphData(newGraphData);
      setSchemaInfo({
        labels: uniqueLabels,
        relationshipTypes: uniqueRelTypes
      });

      // Initialize with all types selected
      setSelectedNodeTypes(new Set(uniqueLabels));
      setSelectedRelTypes(new Set(uniqueRelTypes));

      setIsLoading(false);
      console.log('✅ Mock data loaded successfully');
      console.log(`📊 Loaded ${transformedNodes.length} nodes and ${transformedEdges.length} relationships`);
      
    } catch (err) {
      console.error('❌ Error loading mock data:', err);
      setError('Failed to load graph data');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMockData();
  }, []);

  // Filter data based on selections
  const filteredData = useMemo(() => {
    if (!graphData.nodes.length) return graphData;

    const filteredNodes = graphData.nodes.filter(node => 
      selectedNodeTypes.has(node.category) &&
      (!searchTerm || node.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const nodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredEdges = graphData.edges.filter(edge =>
      selectedRelTypes.has(edge.type) &&
      nodeIds.has(edge.source) &&
      nodeIds.has(edge.target)
    );

    return {
      nodes: filteredNodes,
      edges: filteredEdges,
      relationships: filteredEdges
    };
  }, [graphData, selectedNodeTypes, selectedRelTypes, searchTerm]);

  // Toggle functions
  const toggleNodeType = (type) => {
    const newSet = new Set(selectedNodeTypes);
    if (newSet.has(type)) {
      newSet.delete(type);
    } else {
      newSet.add(type);
    }
    setSelectedNodeTypes(newSet);
  };

  const toggleRelType = (type) => {
    const newSet = new Set(selectedRelTypes);
    if (newSet.has(type)) {
      newSet.delete(type);
    } else {
      newSet.add(type);
    }
    setSelectedRelTypes(newSet);
  };

  // View type icons
  const getViewIcon = (type) => {
    switch (type) {
      case 'graph': return <FiGrid />;
      case 'table': return <FiList />;
      case 'tree': return <FiLayers />;
      default: return <FiGrid />;
    }
  };

  // Node type colors
  const getNodeTypeColor = (type) => {
    const colors = {
      'Module': '#8b5cf6',
      'Feature': '#06b6d4', 
      'Entity': '#10b981',
      'Workflow': '#f59e0b'
    };
    return colors[type] || '#6b7280';
  };

  if (isLoading) {
    return (
      <div className="kb-container">
        <div className="kb-loading">
          <FiRefreshCw className="loading-spinner" />
          <span>Loading Knowledge Graph...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="kb-container">
        <div className="kb-error">
          <span>Error: {error}</span>
          <button onClick={loadMockData} className="kb-retry-btn">
            <FiRefreshCw /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="kb-container">
      {/* Floating Left Panel */}
      {isLeftPanelOpen && (
        <div className="kb-floating-panel kb-left-panel">
          <div className="kb-panel-header">
            <h3><FiFilter /> Filters & Controls</h3>
            <button 
              className="kb-panel-close"
              onClick={() => setIsLeftPanelOpen(false)}
            >
              ×
            </button>
          </div>

          <div className="kb-panel-content">
            {/* Search */}
            <div className="kb-section">
              <label className="kb-section-title">Search</label>
              <div className="kb-search-container">
                <FiSearch className="kb-search-icon" />
                <input
                  type="text"
                  className="kb-search-input"
                  placeholder="Search nodes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* View Type */}
            <div className="kb-section">
              <label className="kb-section-title">View Type</label>
              <div className="kb-view-types">
                {['graph', 'table', 'tree'].map(type => (
                  <button
                    key={type}
                    className={`kb-view-btn ${viewType === type ? 'active' : ''}`}
                    onClick={() => setViewType(type)}
                  >
                    {getViewIcon(type)}
                    <span>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Node Types */}
            <div className="kb-section">
              <label className="kb-section-title">Node Types</label>
              <div className="kb-filter-list">
                {schemaInfo.labels.map(label => (
                  <div key={label} className="kb-filter-item">
                    <label className="kb-checkbox-label">
                      <input
                        type="checkbox"
                        checked={selectedNodeTypes.has(label)}
                        onChange={() => toggleNodeType(label)}
                      />
                      <span className="kb-checkmark"></span>
                      <div className="kb-node-type-info">
                        <div 
                          className="kb-node-color-indicator"
                          style={{ backgroundColor: getNodeTypeColor(label) }}
                        ></div>
                        <span>{label}</span>
                        <span className="kb-count">
                          ({graphData.nodes.filter(n => n.category === label).length})
                        </span>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Relationship Types */}
            <div className="kb-section">
              <label className="kb-section-title">Relationships</label>
              <div className="kb-filter-list">
                {schemaInfo.relationshipTypes.map(type => (
                  <div key={type} className="kb-filter-item">
                    <label className="kb-checkbox-label">
                      <input
                        type="checkbox"
                        checked={selectedRelTypes.has(type)}
                        onChange={() => toggleRelType(type)}
                      />
                      <span className="kb-checkmark"></span>
                      <span>{type}</span>
                      <span className="kb-count">
                        ({graphData.edges.filter(e => e.type === type).length})
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Graph Area */}
      <div className="kb-main-area">
        {/* Top Toolbar */}
        <div className="kb-toolbar">
          <div className="kb-toolbar-left">
            {!isLeftPanelOpen && (
              <button 
                className="kb-toolbar-btn"
                onClick={() => setIsLeftPanelOpen(true)}
              >
                <FiFilter /> Filters
              </button>
            )}
            <div className="kb-stats">
              <span className="kb-stat">
                <FiDatabase /> {filteredData.nodes.length} nodes
              </span>
              <span className="kb-stat">
                {filteredData.edges.length} relationships
              </span>
            </div>
          </div>
          
          <div className="kb-toolbar-right">
            <button className="kb-toolbar-btn" onClick={loadMockData}>
              <FiRefreshCw /> Refresh
            </button>
            <button className="kb-toolbar-btn">
              <FiZoomIn />
            </button>
            <button className="kb-toolbar-btn">
              <FiZoomOut />
            </button>
            {!isRightPanelOpen && (
              <button 
                className="kb-toolbar-btn"
                onClick={() => setIsRightPanelOpen(true)}
              >
                <FiEye /> Details
              </button>
            )}
          </div>
        </div>

        {/* Graph Canvas */}
        <div className="kb-graph-container">
          <Neo4jGraph 
            data={filteredData}
            onNodeSelect={setSelectedNode}
            viewType={viewType}
          />
        </div>
      </div>

      {/* Floating Right Panel */}
      {isRightPanelOpen && (
        <div className="kb-floating-panel kb-right-panel">
          <div className="kb-panel-header">
            <h3><FiEye /> Node Details</h3>
            <button 
              className="kb-panel-close"
              onClick={() => setIsRightPanelOpen(false)}
            >
              ×
            </button>
          </div>

          <div className="kb-panel-content">
            {selectedNode ? (
              <div className="kb-node-details">
                <div className="kb-node-header">
                  <div 
                    className="kb-node-color-indicator large"
                    style={{ backgroundColor: getNodeTypeColor(selectedNode.category) }}
                  ></div>
                  <div>
                    <h4>{selectedNode.name}</h4>
                    <span className="kb-node-type">{selectedNode.category}</span>
                  </div>
                </div>

                <div className="kb-node-property">
                  <strong>ID:</strong> {selectedNode.id}
                </div>

                {selectedNode.description && (
                  <div className="kb-node-property">
                    <strong>Description:</strong> {selectedNode.description}
                  </div>
                )}

                {Object.keys(selectedNode.properties || {}).length > 0 && (
                  <div className="kb-section">
                    <label className="kb-section-title">Properties</label>
                    {Object.entries(selectedNode.properties).map(([key, value]) => (
                      <div key={key} className="kb-node-property">
                        <strong>{key}:</strong> {String(value)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="kb-no-selection">
                <FiDatabase size={48} />
                <p>Select a node to view details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBase; 