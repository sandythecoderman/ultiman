import React, { useState, useEffect, useMemo } from 'react';
import Neo4jGraph from '../components/Neo4jGraph';
import Chat from '../components/Chat';
import { 
  FiSearch, 
  FiLayers, 
  FiLink, 
  FiCheckSquare, 
  FiX, 
  FiRefreshCw, 
  FiEye, 
  FiCopy, 
  FiMaximize2, 
  FiMinimize2, 
  FiZoomIn, 
  FiZoomOut, 
  FiRotateCcw, 
  FiDownload, 
  FiSettings, 
  FiList,
  FiFilter,
  FiInfo,
  FiSquare,
  FiMousePointer,
  FiDatabase,
  FiCheck,
  FiMove
} from 'react-icons/fi';
import './KnowledgeBase.css';
import mockGraphData from '../data/mockGraphData';

const KnowledgeBase = () => {
  // Core state
  const [graphData, setGraphData] = useState({ nodes: [], edges: [], relationships: [] });
  const [schemaInfo, setSchemaInfo] = useState({ labels: [], relationshipTypes: [] });
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNodeTypes, setSelectedNodeTypes] = useState(new Set());
  const [selectedRelTypes, setSelectedRelTypes] = useState(new Set());

  const [isFullscreen, setIsFullscreen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [graphStats, setGraphStats] = useState({ nodes: 0, edges: 0 });
  const [showInfo, setShowInfo] = useState(false);
  const [isGraphCleared, setIsGraphCleared] = useState(false);
  const [messages, setMessages] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [expandedNodes, setExpandedNodes] = useState(new Set());

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

  // Simplified filtering logic
  const filteredData = useMemo(() => {
    if (isGraphCleared) {
      return { nodes: [], edges: [] };
    }
    
    let filteredNodes = [];
    let filteredEdges = [];

    // Step 1: Filter by node types
    if (selectedNodeTypes.size > 0) {
      filteredNodes = graphData.nodes.filter(node => selectedNodeTypes.has(node.category));
    } else {
      // If no node types selected, show all nodes
      filteredNodes = graphData.nodes;
    }

    // Step 2: Filter by relationship types (only if both node types and relationship types are selected)
    if (selectedNodeTypes.size > 0 && selectedRelTypes.size > 0) {
      // Get IDs of selected nodes
      const selectedNodeIds = new Set(filteredNodes.map(n => n.id));
      
      // Filter relationships by type and ensure at least one end (source or target) is in selected nodes
      filteredEdges = graphData.edges.filter(edge => 
        selectedRelTypes.has(edge.type) && 
        (selectedNodeIds.has(edge.source) || selectedNodeIds.has(edge.target))
      );
      
      // Include all nodes connected by these relationships (both source and target)
      const connectedNodeIds = new Set();
      filteredEdges.forEach(edge => {
        connectedNodeIds.add(edge.source);
        connectedNodeIds.add(edge.target);
      });
      
      // Add connected nodes to filtered nodes
      const connectedNodes = graphData.nodes.filter(node => connectedNodeIds.has(node.id));
      filteredNodes = [...new Set([...filteredNodes, ...connectedNodes])];
      
    } else if (selectedNodeTypes.size > 0 && selectedRelTypes.size === 0) {
      // Only node types selected - show no relationships
      filteredEdges = [];
    } else if (selectedNodeTypes.size === 0 && selectedRelTypes.size > 0) {
      // Only relationship types selected - show all relationships of that type
      filteredEdges = graphData.edges.filter(edge => selectedRelTypes.has(edge.type));
      
      // Include all nodes connected by these relationships
      const connectedNodeIds = new Set();
      filteredEdges.forEach(edge => {
        connectedNodeIds.add(edge.source);
        connectedNodeIds.add(edge.target);
      });
      filteredNodes = graphData.nodes.filter(node => connectedNodeIds.has(node.id));
    } else {
      // Nothing selected - show everything
      filteredNodes = graphData.nodes;
      filteredEdges = graphData.edges;
    }

    // Step 3: Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchingNodeIds = new Set();
      
      filteredNodes.forEach(node => {
        if (node.name.toLowerCase().includes(query) || 
            (node.description && node.description.toLowerCase().includes(query))) {
          matchingNodeIds.add(node.id);
        }
      });

      // Filter nodes to only matching ones
      filteredNodes = filteredNodes.filter(node => matchingNodeIds.has(node.id));
      
      // Filter edges to only those connected to matching nodes
      filteredEdges = filteredEdges.filter(edge => 
        matchingNodeIds.has(edge.source) || matchingNodeIds.has(edge.target)
      );
    }

    // Ensure data structure consistency for Neo4jGraph component
    const result = { 
      nodes: filteredNodes, 
      relationships: filteredEdges  // Neo4jGraph expects 'relationships', not 'edges'
    };
    
    console.log(`🔄 Filtered data: ${result.nodes.length} nodes, ${result.relationships.length} relationships`);
    console.log(`📊 Selected node types: ${Array.from(selectedNodeTypes).join(', ')}`);
    console.log(`🔗 Selected relationship types: ${Array.from(selectedRelTypes).join(', ')}`);
    
    return result;
  }, [graphData, selectedNodeTypes, selectedRelTypes, searchQuery, isGraphCleared]);

  // Toggle functions
  const toggleNodeType = (type) => {
    const newSet = new Set(selectedNodeTypes);
    if (newSet.has(type)) {
      newSet.delete(type);
      showNotification(`Deselected ${type} nodes`);
    } else {
      newSet.add(type);
      const count = graphData.nodes.filter(n => n.category === type).length;
      showNotification(`Selected ${count} ${type} nodes`);
    }
    setSelectedNodeTypes(newSet);
  };

  const toggleRelType = (type) => {
    const newSet = new Set(selectedRelTypes);
    if (newSet.has(type)) {
      newSet.delete(type);
      showNotification(`Deselected ${type} relationships`);
    } else {
      newSet.add(type);
      const count = graphData.edges.filter(e => e.type === type).length;
      showNotification(`Selected ${count} ${type} relationships`);
    }
    setSelectedRelTypes(newSet);
  };

  // Node expansion functionality
  const handleNodeExpansion = (nodeId) => {
    const newExpandedNodes = new Set(expandedNodes);
    if (newExpandedNodes.has(nodeId)) {
      newExpandedNodes.delete(nodeId);
    } else {
      newExpandedNodes.add(nodeId);
    }
    setExpandedNodes(newExpandedNodes);
  };

  // Utility functions
  const expandSelectedNodeTypes = () => {
    const nodesToExpand = graphData.nodes
      .filter(node => selectedNodeTypes.has(node.category))
      .map(node => node.id);
    
    setExpandedNodes(new Set([...expandedNodes, ...nodesToExpand]));
    showNotification(`Expanded ${nodesToExpand.length} nodes`);
  };

  const selectAll = () => {
    setSelectedNodeTypes(new Set(schemaInfo.labels));
    showNotification('Selected all node types');
  };

  const clearAll = () => {
    setSelectedNodeTypes(new Set());
    setSelectedRelTypes(new Set());
    showNotification('Cleared all selections');
  };

  const selectAllRelTypes = () => {
    setSelectedRelTypes(new Set(schemaInfo.relationshipTypes));
    showNotification('Selected all relationship types');
  };

  const clearAllRelTypes = () => {
    setSelectedRelTypes(new Set());
    showNotification('Cleared all relationship selections');
  };

  const resetFilters = () => {
    setSelectedNodeTypes(new Set());
    setSelectedRelTypes(new Set());
    setSearchQuery('');
    setExpandedNodes(new Set());
    setIsGraphCleared(false);
    showNotification('Reset all filters');
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const refreshGraph = () => {
    loadMockData();
    showNotification('Graph refreshed');
  };

  const fitScreen = () => {
    // This will be handled by the Neo4jGraph component
    showNotification('Fitting to screen');
  };

  const resetZoom = () => {
    // This will be handled by the Neo4jGraph component
    showNotification('Reset zoom');
  };

  const exportGraphData = () => {
    const dataStr = JSON.stringify(filteredData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'knowledge-graph-data.json';
    link.click();
    URL.revokeObjectURL(url);
    showNotification('Graph data exported');
  };

  const showGraphInfo = () => {
    setShowInfo(!showInfo);
  };

  const zoomIn = () => {
    // This will be handled by the Neo4jGraph component
    showNotification('Zoomed in');
  };

  const zoomOut = () => {
    // This will be handled by the Neo4jGraph component
    showNotification('Zoomed out');
  };

  const fitToScreen = () => {
    // This will be handled by the Neo4jGraph component
    showNotification('Fitted to screen');
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

  const getNodeTypeColor = (type) => {
    const colors = {
      'module': '#3B82F6',
      'feature': '#10B981',
      'entity': '#F59E0B',
      'workflow': '#8B5CF6',
      'default': '#6B7280'
    };
    return colors[type] || colors.default;
  };

  const handleSendMessage = async (message) => {
    // Add user message
    const userMessage = {
      id: Date.now(),
      text: message,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = {
        id: Date.now() + 1,
        text: `I can help you explore the knowledge graph. I found ${filteredData.nodes.length} nodes and ${filteredData.relationships.length} relationships. What would you like to know?`,
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
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
    <div className={`kb-container ${isFullscreen ? 'graph-fullscreen' : ''}`}>
      {/* Left Panel - Explorer */}
      <div className="kb-left-panel">
        {/* Search Section */}
        <div className="kb-search-section">
          <div className="kb-search-container">
            <FiSearch className="kb-search-icon" />
            <input
              type="text"
              className="kb-search-input"
              placeholder="Search nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* Quick Actions */}
          <div className="kb-quick-actions">
            <button className="kb-action-btn" onClick={selectAll}>
              <FiCheckSquare />
              All
            </button>
            <button className="kb-action-btn" onClick={clearAll}>
              <FiX />
              Clear
            </button>
            <button className="kb-action-btn" onClick={resetFilters}>
              <FiRefreshCw />
              Reset
            </button>
          </div>
        </div>

        {/* Filter Sections */}
        <div className="kb-filter-section">
          {/* Node Types */}
          <div className="kb-section-header">
            <label className="kb-section-title">
              <FiLayers className="kb-section-icon" />
              Node Types
              <span className="kb-filter-count">
                ({selectedNodeTypes.size}/{schemaInfo.labels.length})
              </span>
            </label>
          </div>
          <div className="kb-segmented-control">
            {schemaInfo.labels.map(type => {
              const count = graphData.nodes.filter(n => n.category === type).length;
              const isSelected = selectedNodeTypes.has(type);
              const color = getNodeTypeColor(type);
              return (
                <button
                  key={type}
                  className={`kb-segment ${isSelected ? 'selected' : ''}`}
                  onClick={() => toggleNodeType(type)}
                  title={`${type} (${count} nodes)`}
                  style={{ '--segment-color': color }}
                >
                  <span className="kb-segment-label">{type}</span>
                  <span className="kb-segment-count">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Relationship Types */}
          <div className="kb-section-header">
            <label className="kb-section-title">
              <FiLink className="kb-section-icon" />
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

      {/* Center Graph Area */}
      <div className="kb-main-area">
        {/* Top Toolbar */}
        <div className="kb-toolbar">
          <div className="kb-toolbar-left">
            <div className="kb-stats">
              <span className="kb-stat">
                <strong>Nodes:</strong> {filteredData.nodes.length}
              </span>
              <span className="kb-stat">
                <strong>Links:</strong> {filteredData.relationships.length}
              </span>
            </div>
            
            <div className="kb-toolbar-divider"></div>
            
            <div className="kb-toolbar-group">
              <button 
                className="kb-toolbar-btn secondary"
                onClick={refreshGraph}
                title="Refresh graph"
              >
                <FiRefreshCw />
              </button>
              <button 
                className="kb-toolbar-btn secondary"
                onClick={fitScreen}
                title="Fit to screen"
              >
                <FiMove />
              </button>
              <button 
                className="kb-toolbar-btn secondary"
                onClick={resetZoom}
                title="Reset zoom"
              >
                <FiRotateCcw />
              </button>
            </div>
          </div>
          
          <div className="kb-toolbar-right">
            <button 
              className="kb-toolbar-btn secondary"
              onClick={exportGraphData}
              title="Export graph data"
            >
              <FiDownload />
            </button>
            <button 
              className="kb-toolbar-btn secondary"
              onClick={() => setShowInfo(!showInfo)}
              title="Graph information"
            >
              <FiInfo />
            </button>
            <button 
              className="kb-toolbar-btn fullscreen"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? <FiMinimize2 /> : <FiMaximize2 />}
            </button>
          </div>
        </div>

        {/* Graph Canvas */}
        <div className="kb-graph-container">
          <Neo4jGraph 
            data={filteredData}
            onNodeSelect={setSelectedNode}
            expandedNodes={expandedNodes}
            onNodeExpansion={handleNodeExpansion}
          />
          
          {/* Info Panel */}
          {showInfo && (
            <div className="kb-info-panel">
              <div className="kb-info-header">
                <h4><FiInfo /> Graph Information</h4>
                <button className="kb-info-close" onClick={() => setShowInfo(false)}>
                  <FiX />
                </button>
              </div>
              <div className="kb-info-content">
                <div className="kb-info-section">
                  <h5>Statistics</h5>
                  <div className="kb-info-stats">
                    <div className="kb-info-stat">
                      <span className="kb-info-label">Total Nodes:</span>
                      <span className="kb-info-value">{graphData.nodes.length}</span>
                    </div>
                    <div className="kb-info-stat">
                      <span className="kb-info-label">Total Relationships:</span>
                      <span className="kb-info-value">{graphData.edges.length}</span>
                    </div>
                    <div className="kb-info-stat">
                      <span className="kb-info-label">Node Types:</span>
                      <span className="kb-info-value">{schemaInfo.labels.length}</span>
                    </div>
                    <div className="kb-info-stat">
                      <span className="kb-info-label">Relationship Types:</span>
                      <span className="kb-info-value">{schemaInfo.relationshipTypes.length}</span>
                    </div>
                  </div>
                </div>
                
                <div className="kb-info-section">
                  <h5>Current View</h5>
                  <div className="kb-info-details">
                    <div className="kb-info-detail">
                      <span className="kb-info-label">View Mode:</span>
                      <span className="kb-info-value">
                        {selectedNodeTypes.size > 0 && selectedRelTypes.size > 0 ? 'Nodes + Relationships' :
                         selectedNodeTypes.size > 0 ? 'Nodes Only' :
                         selectedRelTypes.size > 0 ? 'Relationships Only' : 'All Data'}
                      </span>
                    </div>
                    <div className="kb-info-detail">
                      <span className="kb-info-label">Filtered Nodes:</span>
                      <span className="kb-info-value">{filteredData.nodes.length}</span>
                    </div>
                    <div className="kb-info-detail">
                      <span className="kb-info-label">Filtered Relationships:</span>
                      <span className="kb-info-value">{filteredData.relationships.length}</span>
                    </div>
                    <div className="kb-info-detail">
                      <span className="kb-info-label">Search Query:</span>
                      <span className="kb-info-value">{searchQuery || 'None'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="kb-info-section">
                  <h5>Controls</h5>
                  <div className="kb-info-controls">
                    <div className="kb-info-control">
                      <FiMousePointer />
                      <span>Click nodes to view details</span>
                    </div>
                    <div className="kb-info-control">
                      <FiMaximize2 />
                      <span>Drag to pan, scroll to zoom</span>
                    </div>
                    <div className="kb-info-control">
                      <FiDatabase />
                      <span>Use toolbar to control view</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Node Details */}
      <div className="kb-floating-panel kb-right-panel">
        <div className="kb-panel-header">
          <h3><FiEye /> Details</h3>
        </div>
        <div className="kb-panel-content">
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
                      <FiCheck size={14} /> 
                      <span>Add to Favorites</span>
                    </button>
                  </div>
                </div>

                {/* Technical Details Section */}
                {Object.keys(selectedNode.properties || {}).length > 0 && (
                  <div className="kb-detail-section">
                    <h5 className="kb-section-title">
                      <FiDatabase size={16} />
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
                    <FiDatabase size={16} />
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