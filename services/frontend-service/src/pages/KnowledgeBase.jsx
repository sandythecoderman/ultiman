import React, { useState, useEffect, useMemo } from 'react';
import Neo4jGraph from '../components/Neo4jGraph';
import { 
  FiSearch, FiGrid, FiList, FiZoomIn, FiZoomOut, FiRefreshCw, 
  FiSettings, FiFilter, FiEye, FiLayers, FiDatabase, FiX,
  FiChevronRight, FiChevronLeft, FiMaximize2, FiMinimize2,
  FiCopy, FiLink, FiClock, FiStar, FiCheck, FiX as FiXIcon,
  FiMoreHorizontal, FiPlay, FiDownload, FiMaximize, FiMinimize,
  FiBarChart2, FiSidebar, FiMonitor, FiFileText, FiRotateCcw,
  FiChevronRight as FiChevronRightIcon, FiChevronLeft as FiChevronLeftIcon
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
  const [viewType, setViewType] = useState('graph');
  const [selectedNodeTypes, setSelectedNodeTypes] = useState(new Set());
  const [selectedRelTypes, setSelectedRelTypes] = useState(new Set());
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [showActions, setShowActions] = useState(false);

  // Load mock data
  const loadMockData = () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('🔍 Loading mock graph data...');

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

      const uniqueLabels = [...new Set(transformedNodes.map(n => n.category))];
      const uniqueRelTypes = [...new Set(transformedEdges.map(e => e.type))];



      setGraphData(newGraphData);
      setSchemaInfo({
        labels: uniqueLabels,
        relationshipTypes: uniqueRelTypes
      });

      // Initialize with all node types and relationship types selected by default
      setSelectedNodeTypes(new Set(uniqueLabels));
      setSelectedRelTypes(new Set(uniqueRelTypes));

      setIsLoading(false);
      console.log('✅ Mock data loaded successfully');
      
    } catch (err) {
      console.error('❌ Error loading mock data:', err);
      setError('Failed to load graph data');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMockData();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showActions && !event.target.closest('.kb-panel-actions')) {
        setShowActions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showActions]);

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
    showNotification('All node types shown');
  };

  const clearAllNodeTypes = () => {
    setSelectedNodeTypes(new Set());
    showNotification('All node types hidden');
  };

  const selectAllRelTypes = () => {
    setSelectedRelTypes(new Set(schemaInfo.relationshipTypes));
    showNotification('All relationship types shown');
  };

  const clearAllRelTypes = () => {
    setSelectedRelTypes(new Set());
    showNotification('All relationship types hidden');
  };

  const resetAllFilters = () => {
    setSelectedNodeTypes(new Set(schemaInfo.labels));
    setSelectedRelTypes(new Set(schemaInfo.relationshipTypes));
    setSearchTerm('');
    setSelectedNode(null);
    showNotification('Graph reset - all node types and relationships restored');
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

  // Export functionality
  const exportGraphData = () => {
    try {
      const exportData = {
        nodes: filteredData.nodes,
        edges: filteredData.edges,
        exportDate: new Date().toISOString(),
        filters: {
          selectedNodeTypes: Array.from(selectedNodeTypes),
          selectedRelTypes: Array.from(selectedRelTypes),
          searchTerm
        }
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `knowledge-graph-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showNotification('Graph data exported successfully');
    } catch (err) {
      console.error('Export failed:', err);
      showNotification('Export failed');
    }
  };

  // Toggle view modes
  const toggleViewMode = () => {
    setViewType(viewType === 'graph' ? 'list' : 'graph');
    showNotification(`Switched to ${viewType === 'graph' ? 'list' : 'graph'} view`);
  };

  // Toggle panel visibility
  const toggleLeftPanel = () => {
    const leftPanel = document.querySelector('.kb-left-panel');
    if (leftPanel) {
      leftPanel.style.display = leftPanel.style.display === 'none' ? 'flex' : 'none';
      showNotification('Left panel toggled');
    }
  };

  const toggleRightPanelVisibility = () => {
    const rightPanel = document.querySelector('.kb-right-panel');
    if (rightPanel) {
      rightPanel.style.display = rightPanel.style.display === 'none' ? 'flex' : 'none';
      showNotification('Right panel toggled');
    }
  };

  // Graph control functions
  const fitToScreen = () => {
    window.dispatchEvent(new CustomEvent('fitToScreen'));
    showNotification('Graph fitted to screen');
  };

  const resetZoom = () => {
    window.dispatchEvent(new CustomEvent('resetZoom'));
    showNotification('Zoom reset');
  };

  const zoomIn = () => {
    window.dispatchEvent(new CustomEvent('zoomIn'));
    showNotification('Zoomed in');
  };

  const zoomOut = () => {
    window.dispatchEvent(new CustomEvent('zoomOut'));
    showNotification('Zoomed out');
  };

  // Node action functions
  const showNodeConnections = () => {
    if (selectedNode) {
      // Filter to show only connections for this node
      const nodeConnections = filteredData.edges.filter(edge => 
        edge.source === selectedNode.id || edge.target === selectedNode.id
      );
      showNotification(`Showing ${nodeConnections.length} connections for ${selectedNode.name}`);
    }
  };

  const expandNodeView = () => {
    if (selectedNode) {
      showNotification(`Expanded view for ${selectedNode.name}`);
      // Could open in new tab or modal
    }
  };

  const addToFavorites = () => {
    if (selectedNode) {
      showNotification(`${selectedNode.name} added to favorites`);
      // Could store in localStorage or state
    }
  };



  // Statistics
  const getGraphStats = () => {
    const totalNodes = graphData.nodes.length;
    const totalEdges = graphData.edges.length;
    const filteredNodes = filteredData.nodes.length;
    const filteredEdges = filteredData.edges.length;
    
    return {
      totalNodes,
      totalEdges,
      filteredNodes,
      filteredEdges,
      nodeTypes: schemaInfo.labels.length,
      relTypes: schemaInfo.relationshipTypes.length
    };
  };

  const getNodeTypeColor = (type) => {
    if (!type || typeof type !== 'string') {
      return '#6b7280';
    }
    
    const colors = {
      'module': '#6366f1',
      'feature': '#10b981',
      'entity': '#f59e0b',
      'workflow': '#ef4444',
      'user': '#8b5cf6',
      'document': '#06b6d4',
      'system': '#84cc16',
      'process': '#ec4899',
      'data': '#3b82f6',
      'api': '#f97316'
    };
    return colors[type.toLowerCase()] || '#6b7280';
  };

  const getRelationshipColor = (type) => {
    if (!type || typeof type !== 'string') {
      return '#ffffff';
    }
    
    // All relationships use white color
    return '#ffffff';
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
      {/* Left Panel - Knowledge Explorer */}
      <div className="kb-floating-panel kb-left-panel">
        <div className="kb-panel-header">
          <h3><FiDatabase /> Knowledge Explorer</h3>
          <div className="kb-panel-actions">
          <button 
            className="kb-panel-close"
              onClick={() => setShowActions(!showActions)}
              title="More actions"
            >
              <FiMoreHorizontal />
            </button>
            {showActions && (
              <div className="kb-actions-dropdown">
                <button onClick={exportGraphData}>
                  <FiDownload size={14} /> Export Data
                </button>
                <button onClick={toggleViewMode}>
                  <FiMonitor size={14} /> Toggle View
                </button>
                <button onClick={toggleLeftPanel}>
                  <FiSidebar size={14} /> Toggle Left Panel
                </button>
                <button onClick={toggleRightPanelVisibility}>
                  <FiEye size={14} /> Toggle Right Panel
                </button>
                <button onClick={() => {
                  const stats = getGraphStats();
                  showNotification(`Stats: ${stats.filteredNodes}/${stats.totalNodes} nodes, ${stats.filteredEdges}/${stats.totalEdges} edges`);
                }}>
                  <FiBarChart2 size={14} /> Show Stats
                </button>
                <button onClick={() => {
                  const stats = getGraphStats();
                  const statsText = `Knowledge Graph Statistics:
Total Nodes: ${stats.totalNodes}
Filtered Nodes: ${stats.filteredNodes}
Total Edges: ${stats.totalEdges}
Filtered Edges: ${stats.filteredEdges}
Node Types: ${stats.nodeTypes}
Relationship Types: ${stats.relTypes}`;
                  navigator.clipboard.writeText(statsText);
                  showNotification('Statistics copied to clipboard');
                }}>
                  <FiCopy size={14} /> Copy Stats
                </button>
                <button onClick={resetAllFilters}>
                  <FiRefreshCw size={14} /> Clear Graph
          </button>
              </div>
            )}
          </div>
        </div>
        <div className="kb-panel-content">
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
                <FiCheck size={14} /> All Nodes
              </button>
              <button 
                className="kb-quick-btn"
                onClick={clearAllNodeTypes}
                title="Clear all node types"
              >
                <FiXIcon size={14} /> Clear Nodes
              </button>
              <button 
                className="kb-quick-btn"
                onClick={selectAllRelTypes}
                title="Select all relationship types"
              >
                <FiLink size={14} /> All Rel
              </button>
              <button 
                className="kb-quick-btn"
                onClick={clearAllRelTypes}
                title="Clear all relationship types"
              >
                <FiXIcon size={14} /> Clear Rel
              </button>
            </div>
          </div>
          <div className="kb-section">
            <div className="kb-quick-actions">
              <button 
                className="kb-quick-btn"
                onClick={resetAllFilters}
                title="Clear graph and reset all filters"
              >
                <FiRefreshCw size={14} /> Clear Graph
              </button>
              <button 
                className="kb-quick-btn"
                onClick={toggleViewMode}
                title="Toggle view mode"
              >
                <FiMonitor size={14} /> {viewType === 'graph' ? 'List' : 'Graph'}
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
                    style={{ 
                      '--segment-color': getRelationshipColor(type)
                    }}
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
          <div className="kb-graph-toolbar">
            <div className="kb-graph-info">
              <span>{filteredData.nodes.length} nodes • {filteredData.edges.length} connections</span>
            </div>
            <div className="kb-graph-actions">
              <button onClick={loadMockData} title="Refresh data">
                <FiRefreshCw />
              </button>
              <button onClick={fitToScreen} title="Fit to screen">
                <FiMaximize />
              </button>
              <button onClick={resetZoom} title="Reset zoom">
                <FiRotateCcw />
            </button>
              <button onClick={zoomIn} title="Zoom in">
                <FiZoomIn />
            </button>
              <button onClick={zoomOut} title="Zoom out">
                <FiZoomOut />
            </button>
          </div>
        </div>

          <Neo4jGraph 
            data={filteredData}
            onNodeSelect={setSelectedNode}
            viewType={viewType}
          />
        </div>
      </div>

      {/* Right Panel - Node Details */}
      <div className="kb-floating-panel kb-right-panel">
        <div className="kb-panel-header">
          <h3><FiEye /> Node Details</h3>
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
                    <button 
                      className="kb-action-btn primary" 
                      onClick={showNodeConnections}
                      title="Expand node connections"
                    >
                      <FiLink size={14} /> 
                      <span>Show Connections</span>
                    </button>
                    <button 
                      className="kb-action-btn" 
                      onClick={expandNodeView}
                      title="View in new tab"
                    >
                      <FiMaximize2 size={14} /> 
                      <span>Expand View</span>
                    </button>
                    <button 
                      className="kb-action-btn" 
                      onClick={addToFavorites}
                      title="Add to favorites"
                    >
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
              <h4>Knowledge Graph Explorer</h4>
              <p className="kb-no-selection-description">
                Select any node from the graph to view comprehensive information about its properties, connections, and related data.
              </p>
              
              <div className="kb-feature-preview">
                <h5>What you'll see:</h5>
                <div className="kb-preview-list">
                  <div className="kb-preview-item">
                    <FiDatabase size={16} />
                    <div className="kb-preview-content">
                      <strong>Node Overview</strong>
                      <span>Name, type, and description</span>
                    </div>
                  </div>
                  <div className="kb-preview-item">
                    <FiLink size={16} />
                    <div className="kb-preview-content">
                      <strong>Connection Analysis</strong>
                      <span>Related nodes and relationship types</span>
                    </div>
                  </div>
                  <div className="kb-preview-item">
                    <FiGrid size={16} />
                    <div className="kb-preview-content">
                      <strong>Technical Properties</strong>
                      <span>Detailed attributes and metadata</span>
                    </div>
                  </div>
                  <div className="kb-preview-item">
                    <FiSettings size={16} />
                    <div className="kb-preview-content">
                      <strong>Quick Actions</strong>
                      <span>Expand, favorite, and explore options</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="kb-interaction-tips">
                <div className="kb-tip-item">
                  <FiEye size={16} />
                  <div className="kb-tip-content">
                    <strong>Click:</strong>
                    <span>Select and view node details</span>
                  </div>
                </div>
                <div className="kb-tip-item">
                  <FiSearch size={16} />
                  <div className="kb-tip-content">
                    <strong>Search:</strong>
                    <span>Filter nodes by name and type</span>
                  </div>
                </div>
              </div>

              <div className="kb-detail-section">
                <h5 className="kb-section-title">
                  <FiGrid size={16} />
                  Quick Actions
                </h5>
                <div className="kb-shortcuts-grid">
                  <div className="kb-shortcut-item">
                    <span>Search nodes</span><kbd>Type to search</kbd>
                  </div>
                  <div className="kb-shortcut-item">
                    <span>Filter types</span><kbd>Click segments</kbd>
                  </div>
                  <div className="kb-shortcut-item">
                    <span>Reset filters</span><kbd>Reset button</kbd>
                  </div>
                  <div className="kb-shortcut-item">
                    <span>Zoom controls</span><kbd>Mouse wheel</kbd>
                  </div>
                  <div className="kb-shortcut-item">
                    <span>Pan graph</span><kbd>Drag canvas</kbd>
                  </div>
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