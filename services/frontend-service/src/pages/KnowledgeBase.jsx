import React, { useState, useEffect, useMemo } from 'react';
import Neo4jGraph from '../components/Neo4jGraph';
import { 
  FiSearch, FiGrid, FiList, FiZoomIn, FiZoomOut, FiRefreshCw, 
  FiSettings, FiFilter, FiEye, FiLayers, FiDatabase, FiX,
  FiChevronRight, FiChevronLeft, FiMaximize2, FiMinimize2,
  FiCopy, FiLink, FiClock, FiStar, FiCheck, FiX as FiXIcon
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
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');

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

      // Initialize with nothing selected
      setSelectedNodeTypes(new Set());
      setSelectedRelTypes(new Set());

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

  const selectAllNodeTypes = () => {
    setSelectedNodeTypes(new Set(schemaInfo.labels));
  };

  const clearAllNodeTypes = () => {
    setSelectedNodeTypes(new Set());
  };

  const selectAllRelTypes = () => {
    setSelectedRelTypes(new Set(schemaInfo.relationshipTypes));
  };

  const clearAllRelTypes = () => {
    setSelectedRelTypes(new Set());
  };

  const resetAllFilters = () => {
    setSelectedNodeTypes(new Set());
    setSelectedRelTypes(new Set());
    setSearchTerm('');
  };

  const copyNodeId = () => {
    if (selectedNode) {
      navigator.clipboard.writeText(selectedNode.id);
      showNotification('Node ID copied to clipboard');
    }
  };

  const showNotification = (message) => {
    setNotificationMessage(message);
    setShowNotifications(true);
    setTimeout(() => setShowNotifications(false), 3000);
  };

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
    if (!type || typeof type !== 'string') {
      return '#6b7280'; // Default gray color
    }
    
    const colors = {
      'module': '#6366f1',     // Indigo - Core system modules
      'feature': '#10b981',    // Emerald - Feature functionality  
      'entity': '#f59e0b',     // Amber - Data entities
      'workflow': '#ef4444',   // Red - Process workflows
      'user': '#8b5cf6',       // Purple - User-related
      'document': '#06b6d4',   // Cyan - Documentation
      'system': '#84cc16',     // Lime - System components
      'process': '#ec4899',    // Pink - Business processes
      'data': '#3b82f6',       // Blue - Data objects
      'api': '#f97316'         // Orange - API endpoints
    };
    return colors[type.toLowerCase()] || '#6b7280';
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
      <div 
        className={`kb-floating-panel kb-left-panel ${isLeftPanelOpen ? 'open' : 'collapsed'}`}
        onWheel={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="kb-panel-header">
          <h3><FiGrid /> Explorer</h3>
          <button 
            className="kb-panel-close"
            onClick={() => setIsLeftPanelOpen(false)}
            title="Collapse panel"
          >
            <FiChevronLeft />
          </button>
        </div>

        <div 
          className="kb-panel-content"
          onWheel={(e) => {
            // Prevent scroll events from reaching the graph
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            // Prevent mouse events from reaching the graph
            e.stopPropagation();
          }}
        >
          {/* Search */}
          <div className="kb-section">
            <div className="kb-search-container">
              <FiSearch className="kb-search-icon" />
              <input
                type="text"
                className="kb-search-input"
                placeholder="Search nodes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button 
                  className="kb-search-clear"
                  onClick={() => setSearchTerm('')}
                  title="Clear search"
                >
                  <FiX size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="kb-section">
            <div className="kb-quick-actions">
              <button 
                className="kb-quick-btn"
                onClick={selectAllNodeTypes}
                title="Select all node types"
              >
                <FiCheck size={14} /> All
              </button>
              <button 
                className="kb-quick-btn"
                onClick={clearAllNodeTypes}
                title="Clear all node types"
              >
                <FiXIcon size={14} /> Clear
              </button>
              <button 
                className="kb-quick-btn"
                onClick={resetAllFilters}
                title="Reset all filters"
              >
                <FiRefreshCw size={14} /> Reset
              </button>
            </div>
          </div>

          {/* Node Types */}
          <div className="kb-section">
            <div className="kb-section-header">
              <label className="kb-section-title">
                Node Types 
                <span className="kb-filter-count">
                  ({selectedNodeTypes.size}/{schemaInfo.labels.length})
                </span>
              </label>
            </div>
            <div className="kb-segmented-control">
              {schemaInfo.labels.map(label => {
                const count = graphData.nodes.filter(n => n.category === label).length;
                const isSelected = selectedNodeTypes.has(label);
                return (
                  <button
                    key={label}
                    className={`kb-segment ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleNodeType(label)}
                    style={{ 
                      '--segment-color': getNodeTypeColor(label)
                    }}
                    title={`${label} (${count} nodes)`}
                  >
                    <span className="kb-segment-label">{label}</span>
                    <span className="kb-segment-count">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Relationship Types */}
          <div className="kb-section">
            <div className="kb-section-header">
              <label className="kb-section-title">
                Relationships
                <span className="kb-filter-count">
                  ({selectedRelTypes.size}/{schemaInfo.relationshipTypes.length})
                </span>
              </label>
            </div>
            <div className="kb-segmented-control">
              {schemaInfo.relationshipTypes.map(type => {
                const count = graphData.edges.filter(e => e.type === type).length;
                const isSelected = selectedRelTypes.has(type);
                return (
                  <button
                    key={type}
                    className={`kb-segment relationship ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleRelType(type)}
                    title={`${type} (${count} relationships)`}
                  >
                    <span className="kb-segment-label">{type}</span>
                    <span className="kb-segment-count">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Graph Area */}
      <div className="kb-main-area">
        {/* Top Toolbar */}
        <div 
          className="kb-toolbar"
          onWheel={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="kb-toolbar-left">
            <div className="kb-stats">
              <span className="kb-stat">
                <strong>Nodes:</strong> {filteredData.nodes.length}
              </span>
              <span className="kb-stat">
                <strong>Links:</strong> {filteredData.edges.length}
              </span>
            </div>
          </div>
          
          <div className="kb-toolbar-center">
            <button className="kb-toolbar-btn compact" onClick={loadMockData} title="Refresh data">
              Refresh
            </button>
            <button className="kb-toolbar-btn compact" onClick={() => window.dispatchEvent(new CustomEvent('fitToScreen'))} title="Fit to screen">
              Fit Screen
            </button>
            <button className="kb-toolbar-btn compact" onClick={() => window.dispatchEvent(new CustomEvent('resetZoom'))} title="Reset zoom">
              Reset Zoom
            </button>
          </div>
        </div>

        {/* Graph Canvas */}
        <div className="kb-graph-container">
          <Neo4jGraph 
            data={filteredData}
            onNodeSelect={setSelectedNode}
            viewType={viewType}
          />
          
          {/* Corner Panel Buttons */}
          {!isLeftPanelOpen && (
            <button 
              className="kb-corner-btn kb-corner-left"
              onClick={() => setIsLeftPanelOpen(true)}
              title="Open Knowledge Explorer"
            >
              <FiGrid size={18} />
            </button>
          )}

          {!isRightPanelOpen && (
            <button 
              className="kb-corner-btn kb-corner-right"
              onClick={() => setIsRightPanelOpen(true)}
              title="Open Node Details"
            >
              <FiEye size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Floating Right Panel */}
      <div 
        className={`kb-floating-panel kb-right-panel ${isRightPanelOpen ? 'open' : 'collapsed'}`}
        onWheel={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="kb-panel-header">
          <h3><FiEye /> Details</h3>
          <button 
            className="kb-panel-close"
            onClick={() => setIsRightPanelOpen(false)}
            title="Collapse panel"
          >
            <FiChevronRight />
          </button>
        </div>

        <div 
          className="kb-panel-content"
          onWheel={(e) => {
            // Prevent scroll events from reaching the graph
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            // Prevent mouse events from reaching the graph
            e.stopPropagation();
          }}
        >
          {selectedNode ? (
            <div className="kb-node-details">
              <div className="kb-node-header">
                <div 
                  className="kb-node-color-indicator large"
                  style={{ backgroundColor: getNodeTypeColor(selectedNode.category) }}
                ></div>
                <div className="kb-node-info">
                  <h4>{selectedNode.name}</h4>
                  <span className="kb-node-type">{selectedNode.category}</span>
                  <span className="kb-node-id">ID: {selectedNode.id}</span>
                </div>
                <button 
                  className="kb-copy-btn"
                  onClick={copyNodeId}
                  title="Copy node ID"
                >
                  <FiCopy size={14} />
                </button>
              </div>

              <div className="kb-node-content">
                {/* Overview Section */}
                <div className="kb-detail-section">
                  <h5 className="kb-section-title">
                    <FiDatabase size={16} />
                    Overview
                  </h5>
                  <div className="kb-overview-grid">
                    <div className="kb-overview-item">
                      <label>Type</label>
                      <span 
                        className="kb-node-type-badge"
                        style={{ '--node-type-color': getNodeTypeColor(selectedNode.category) }}
                      >
                        {selectedNode.category}
                      </span>
                    </div>
                    <div className="kb-overview-item">
                      <label>Name</label>
                      <span>{selectedNode.name}</span>
                    </div>
                    {selectedNode.description && (
                      <div className="kb-overview-item full-width">
                        <label>Description</label>
                        <p className="kb-description">{selectedNode.description}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Connections Section */}
                <div className="kb-detail-section">
                  <h5 className="kb-section-title">
                    <FiLink size={16} />
                    Connections
                  </h5>
                  <div className="kb-connections-info">
                    <div className="kb-connection-stat">
                      <span className="count">{filteredData.relationships.filter(r => r.source === selectedNode.id || r.target === selectedNode.id).length}</span>
                      <span className="label">Total connections</span>
                    </div>
                    <div className="kb-connection-types">
                      {[...new Set(filteredData.relationships.filter(r => r.source === selectedNode.id || r.target === selectedNode.id).map(r => r.type))].map(type => (
                        <span key={type} className="kb-connection-type">{type}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions Section */}
                <div className="kb-detail-section">
                  <h5 className="kb-section-title">
                    <FiSettings size={16} />
                    Actions
                  </h5>
                  <div className="kb-node-actions">
                    <button className="kb-action-btn primary" title="Expand node connections">
                      <FiLink size={14} /> 
                      <span>Show Connections</span>
                    </button>
                    <button className="kb-action-btn" title="View in new tab">
                      <FiMaximize2 size={14} /> 
                      <span>Expand View</span>
                    </button>
                    <button className="kb-action-btn" title="Add to favorites">
                      <FiStar size={14} /> 
                      <span>Add to Favorites</span>
                    </button>
                  </div>
                </div>

                {/* Technical Details Section */}
                {Object.keys(selectedNode.properties || {}).length > 0 && (
                  <div className="kb-detail-section">
                    <h5 className="kb-section-title">
                      <FiGrid size={16} />
                      Technical Properties
                    </h5>
                    <div className="kb-properties-list">
                      {Object.entries(selectedNode.properties).map(([key, value]) => (
                        <div key={key} className="kb-property-row">
                          <span className="kb-property-key">{key}</span>
                          <span className="kb-property-value">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="kb-no-selection">
              <div className="kb-no-selection-icon">
                <FiDatabase size={48} />
              </div>
              <h4>Explore Node Details</h4>
              <p className="kb-no-selection-description">
                Select any node from the graph to view comprehensive information about its properties, connections, and related data.
              </p>
              
              <div className="kb-guide-section">
                <h5>What you'll see:</h5>
                <div className="kb-feature-list">
                  <div className="kb-feature-item">
                    <FiDatabase size={16} />
                    <div>
                      <strong>Node Overview</strong>
                      <span>Name, type, and description</span>
                    </div>
                  </div>
                  <div className="kb-feature-item">
                    <FiLink size={16} />
                    <div>
                      <strong>Connection Analysis</strong>
                      <span>Related nodes and relationship types</span>
                    </div>
                  </div>
                  <div className="kb-feature-item">
                    <FiGrid size={16} />
                    <div>
                      <strong>Technical Properties</strong>
                      <span>Detailed attributes and metadata</span>
                    </div>
                  </div>
                  <div className="kb-feature-item">
                    <FiSettings size={16} />
                    <div>
                      <strong>Quick Actions</strong>
                      <span>Expand, favorite, and explore options</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="kb-interaction-tips">
                <div className="kb-tip">
                  <FiEye size={16} />
                  <span><strong>Hover:</strong> Quick preview of node information</span>
                </div>
                <div className="kb-tip">
                  <FiLink size={16} />
                  <span><strong>Click:</strong> Select and view complete details</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notification System */}
      {showNotifications && (
        <div className="kb-notification">
          <div className="kb-notification-content">
            <FiCheck size={16} />
            <span>{notificationMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBase; 