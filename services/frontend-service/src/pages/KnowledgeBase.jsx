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
  FiMove,
  FiMoreHorizontal
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

      // Initialize with modules selected by default
      setSelectedNodeTypes(new Set(['module']));
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
    if (searchQuery && searchQuery.trim()) {
      try {
        const query = searchQuery.toLowerCase().trim();
        const matchingNodeIds = new Set();
        
        filteredNodes.forEach(node => {
          if (node.name && node.name.toLowerCase().includes(query) || 
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
      } catch (error) {
        console.error('Search error:', error);
        // If search fails, show all nodes
        filteredNodes = graphData.nodes;
        filteredEdges = graphData.edges;
      }
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
  };

  const selectAll = () => {
    const allTypes = new Set(schemaInfo.labels);
    setSelectedNodeTypes(allTypes);
    showNotification(`Selected all ${allTypes.size} node types`);
  };

  const clearAll = () => {
    setSelectedNodeTypes(new Set());
    setSelectedRelTypes(new Set());
    showNotification('Cleared all selections');
  };

  const selectAllRelTypes = () => {
    const allRelTypes = new Set(schemaInfo.relationshipTypes);
    setSelectedRelTypes(allRelTypes);
    showNotification(`Selected all ${allRelTypes.size} relationship types`);
  };

  const clearAllRelTypes = () => {
    setSelectedRelTypes(new Set());
    showNotification('Cleared all relationship selections');
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedNodeTypes(new Set());
    setSelectedRelTypes(new Set());
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
    // This would be handled by the Neo4jGraph component
    showNotification('Fitted graph to screen');
  };

  const resetZoom = () => {
    // This would be handled by the Neo4jGraph component
    showNotification('Reset zoom level');
  };

  const exportGraphData = () => {
    const data = {
      nodes: filteredData.nodes,
      relationships: filteredData.relationships,
      timestamp: new Date().toISOString(),
      filters: {
        nodeTypes: Array.from(selectedNodeTypes),
        relationshipTypes: Array.from(selectedRelTypes),
        searchQuery: searchQuery
      }
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `knowledge-graph-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Graph data exported');
  };

  const showGraphInfo = () => {
    setShowInfo(!showInfo);
  };

  const zoomIn = () => {
    // This would be handled by the Neo4jGraph component
    showNotification('Zoomed in');
  };

  const zoomOut = () => {
    // This would be handled by the Neo4jGraph component
    showNotification('Zoomed out');
  };

  const fitToScreen = () => {
    // This would be handled by the Neo4jGraph component
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
      'module': '#8B5CF6',      // Purple
      'feature': '#10B981',     // Green
      'entity': '#3B82F6',      // Blue
      'workflow': '#F59E0B',    // Orange
      'default': '#6B7280'      // Gray
    };
    return colors[type] || colors.default;
  };

  const handleSendMessage = async (message) => {
    // Add user message
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Simulate AI response
    setTimeout(() => {
      const aiMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: `I understand you're asking about: "${message}". This is a simulated response from the knowledge base AI assistant.`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, aiMessage]);
    }, 1000);
  };

  // Handle node selection from graph
  const handleNodeClick = (node) => {
    setSelectedNode(node);
  };

  if (isLoading) {
    return (
      <div className="kb-container">
        <div className="kb-loading">
          <div className="loading-spinner">⟳</div>
          <p>Loading knowledge graph...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="kb-container">
        <div className="kb-error">
          <p>Error: {error}</p>
          <button className="kb-retry-btn" onClick={loadMockData}>
            <FiRefreshCw /> Retry
          </button>
        </div>
      </div>
    );
  }

  // Fullscreen mode
  if (isFullscreen) {
    return (
      <div className="kb-fullscreen-mode">
        {/* Fullscreen toolbar */}
        <div className="kb-fullscreen-toolbar">
          <div className="kb-fullscreen-title">
            <h2>Knowledge Graph Explorer</h2>
            <span>{filteredData.nodes.length} nodes • {filteredData.relationships.length} relationships</span>
          </div>
          <div className="kb-fullscreen-actions">
            <button onClick={fitToScreen} title="Fit to Screen">
              <FiMaximize2 />
            </button>
            <button onClick={exportGraphData} title="Export">
              <FiDownload />
            </button>
            <button onClick={toggleFullscreen} title="Exit Fullscreen (Esc)">
              <FiX />
            </button>
          </div>
        </div>

        {/* Fullscreen graph */}
        <div className="kb-fullscreen-canvas">
          <Neo4jGraph
            data={filteredData}
            onNodeSelect={handleNodeClick}
            selectedNode={selectedNode}
            expandedNodes={expandedNodes}
            onNodeExpansion={handleNodeExpansion}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="kb-container">
      {/* Left Panel - Explorer */}
      <div className="kb-floating-panel kb-left-panel">
        <div className="kb-panel-header">
          <h3><FiFilter /> Graph Explorer</h3>
        </div>
        <div className="kb-panel-content">
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
                    style={isSelected ? {
                      '--segment-color': color,
                      backgroundColor: color,
                      borderColor: color,
                      color: '#fff',
                    } : {
                      '--segment-color': color,
                      backgroundColor: `${color}20`,
                      borderColor: `${color}40`,
                      color: color,
                    }}
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
      </div>

      {/* Center Graph Area */}
      <div className="kb-main-area">
        <div className="kb-graph-container">
          {/* Graph toolbar */}
          <div className="kb-toolbar">
            <div className="kb-toolbar-left">
              <div className="kb-stats">
                <span className="kb-stat">
                  <FiLayers /> {filteredData.nodes.length} nodes
                </span>
                <span className="kb-stat">
                  <FiLink /> {filteredData.relationships.length} relationships
                </span>
              </div>
            </div>
            <div className="kb-toolbar-center">
              <div className="kb-search-container">
                <FiSearch className="kb-search-icon" />
                <input
                  type="text"
                  placeholder="Search nodes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="kb-search-input"
                />
                {searchQuery && (
                  <button
                    className="kb-search-clear"
                    onClick={() => setSearchQuery('')}
                    title="Clear search"
                  >
                    <FiX />
                  </button>
                )}
              </div>
            </div>
            <div className="kb-toolbar-right">
              <button
                className="kb-toolbar-btn"
                onClick={refreshGraph}
                title="Refresh graph"
              >
                <FiRefreshCw />
              </button>
              <button
                className="kb-toolbar-btn"
                onClick={fitToScreen}
                title="Fit to screen"
              >
                <FiMaximize2 />
              </button>
              <button
                className="kb-toolbar-btn"
                onClick={exportGraphData}
                title="Export data"
              >
                <FiDownload />
              </button>
              <button
                className="kb-toolbar-btn"
                onClick={toggleFullscreen}
                title="Fullscreen mode"
              >
                <FiMaximize2 />
              </button>
            </div>
          </div>

          {/* Graph visualization */}
          <div className="kb-graph-visualization">
            <Neo4jGraph
              data={filteredData}
              onNodeSelect={handleNodeClick}
              selectedNode={selectedNode}
              expandedNodes={expandedNodes}
              onNodeExpansion={handleNodeExpansion}
            />
          </div>
        </div>
      </div>

      {/* Right Panel - Node Details */}
      <div className="kb-floating-panel kb-right-panel">
        <div className="kb-panel-header">
          <h3><FiDatabase /> Node Details</h3>
        </div>
        <div className="kb-panel-content">
          {selectedNode ? (
            <div className="kb-node-details">
              <div className="kb-node-header">
                <div className="kb-node-info">
                  <h4>{selectedNode.name}</h4>
                  <span 
                    className="kb-node-type"
                    style={{ backgroundColor: getNodeTypeColor(selectedNode.category) }}
                  >
                    {selectedNode.category}
                  </span>
                </div>
                <button className="kb-copy-btn" onClick={copyNodeId} title="Copy node ID">
                  <FiCopy />
                </button>
              </div>
              
              <div className="kb-node-properties">
                <div className="kb-node-property">
                  <strong>Name:</strong> {selectedNode.name}
                </div>
                <div className="kb-node-property">
                  <strong>Entity Type:</strong> {selectedNode.category}
                </div>
                <div className="kb-node-property">
                  <strong>Node ID:</strong> {selectedNode.id}
                </div>
                {selectedNode.description && (
                  <div className="kb-node-property">
                    <strong>Description:</strong> {selectedNode.description}
                  </div>
                )}
                {/* Custom Properties */}
                {selectedNode.properties && Object.keys(selectedNode.properties).length > 0 && (
                  <div className="kb-node-property">
                    <strong>Properties:</strong>
                    <table className="kb-properties-table">
                      <tbody>
                        {Object.entries(selectedNode.properties).map(([key, value]) => (
                          <tr key={key}>
                            <td>{key}</td>
                            <td>{String(value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {/* Connected Nodes */}
                <div className="kb-node-property">
                  <strong>Connected Nodes:</strong>
                  <div className="kb-connected-nodes">
                    {(() => {
                      const connectedEdges = graphData.edges.filter(edge => edge.source === selectedNode.id || edge.target === selectedNode.id);
                      const connectedNodeIds = new Set();
                      connectedEdges.forEach(edge => {
                        if (edge.source !== selectedNode.id) connectedNodeIds.add(edge.source);
                        if (edge.target !== selectedNode.id) connectedNodeIds.add(edge.target);
                      });
                      const connectedNodes = graphData.nodes.filter(node => connectedNodeIds.has(node.id));
                      if (connectedNodes.length === 0) return <span className="kb-no-links">No connected nodes</span>;
                      return connectedNodes.map(node => (
                        <div key={node.id} className="kb-connected-node">
                          <span className="kb-connected-node-name">{node.name}</span>
                          <span className="kb-connected-node-type" style={{ backgroundColor: getNodeTypeColor(node.category) }}>{node.category}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
                {/* Link Types */}
                <div className="kb-node-property">
                  <strong>Link Types:</strong>
                  <div className="kb-link-types">
                    {(() => {
                      const incomingLinks = graphData.edges.filter(edge => edge.target === selectedNode.id);
                      const outgoingLinks = graphData.edges.filter(edge => edge.source === selectedNode.id);
                      const allLinkTypes = [...new Set([
                        ...incomingLinks.map(edge => edge.type),
                        ...outgoingLinks.map(edge => edge.type)
                      ])];
                      if (allLinkTypes.length === 0) {
                        return <span className="kb-no-links">No connections</span>;
                      }
                      return allLinkTypes.map(linkType => {
                        const incomingCount = incomingLinks.filter(edge => edge.type === linkType).length;
                        const outgoingCount = outgoingLinks.filter(edge => edge.type === linkType).length;
                        return (
                          <div key={linkType} className="kb-link-type">
                            <span className="kb-link-type-name">{linkType}</span>
                            <span className="kb-link-counts">
                              {incomingCount > 0 && <span className="kb-incoming">← {incomingCount}</span>}
                              {outgoingCount > 0 && <span className="kb-outgoing">→ {outgoingCount}</span>}
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>

              <div className="kb-node-actions">
                <button className="kb-action-btn" onClick={copyNodeId} title="Copy node ID">
                  <FiCopy /> Copy ID
                </button>
                <button className="kb-action-btn" onClick={() => handleNodeExpansion(selectedNode.id)} title="Expand node">
                  <FiEye /> Expand
                </button>
                <button className="kb-action-btn" onClick={() => {/* highlight logic */}} title="Highlight in graph">
                  <FiMove /> Highlight
                </button>
              </div>
            </div>
          ) : (
            <div className="kb-no-selection">
              <div className="kb-no-selection-icon">
                <FiDatabase size={48} />
              </div>
              <h4>Node Details</h4>
              <p className="kb-no-selection-description">
                Select any node from the graph to view its properties and explore connections.
              </p>
              
              <div className="kb-guide-section">
                <h5>What you can do:</h5>
                <div className="kb-feature-list">
                  <div className="kb-feature-item">
                    <FiSearch size={16} />
                    <div>
                      <strong>Search & Filter</strong>
                      <span>Find specific nodes and relationships</span>
                    </div>
                  </div>
                  <div className="kb-feature-item">
                    <FiLink size={16} />
                    <div>
                      <strong>Explore Connections</strong>
                      <span>See how entities are related</span>
                    </div>
                  </div>
                  <div className="kb-feature-item">
                    <FiDatabase size={16} />
                    <div>
                      <strong>View Properties</strong>
                      <span>Examine node details and metadata</span>
                    </div>
                  </div>
                  <div className="kb-feature-item">
                    <FiSettings size={16} />
                    <div>
                      <strong>Fullscreen Mode</strong>
                      <span>Focus on the graph visualization</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="kb-interaction-tips">
                <div className="kb-tip">
                  <FiMousePointer size={16} />
                  <span><strong>Click:</strong> Select and view node details</span>
                </div>
                <div className="kb-tip">
                  <FiSearch size={16} />
                  <span><strong>Search:</strong> Find nodes by name or description</span>
                </div>
                <div className="kb-tip">
                  <FiMaximize2 size={16} />
                  <span><strong>Fullscreen:</strong> Press the fullscreen button</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notifications */}
      {showNotifications && (
        <div className="kb-notification">
          <div className="kb-notification-content">
            {notificationMessage}
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBase; 