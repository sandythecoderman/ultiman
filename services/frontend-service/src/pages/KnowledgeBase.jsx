import React, { useState, useEffect, useMemo } from 'react';
import D3Graph from '../components/D3Graph';
import Sidebar from '../components/Sidebar';
import { FiX, FiDatabase, FiRefreshCw } from 'react-icons/fi';
import './KnowledgeBase.css';
import { KNOWLEDGE_GRAPH_ENDPOINT } from '../config';

const KnowledgeBase = () => {
  // Core state
  const [graphData, setGraphData] = useState({ nodes: [], edges: [], relationships: [] });
  const [schemaInfo, setSchemaInfo] = useState({ labels: [], relationshipTypes: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI state
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLabel, setSelectedLabel] = useState(null);
  const [selectedRelType, setSelectedRelType] = useState(null);

  // Fetch initial graph data
  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('🔍 Fetching initial graph data...');

      const response = await fetch(KNOWLEDGE_GRAPH_ENDPOINT);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📊 Initial data received:', data);

      // Transform data for D3
      const transformedNodes = data.nodes.map(node => ({
        id: node.id,
        name: node.name,
        category: node.category,
        description: node.properties.description || 
                    node.properties.summary || 
                    `${node.labels?.[0] || 'Node'} with ID ${node.id}`,
        properties: node.properties,
        labels: node.labels,
        radius: 30,
        isExpanded: false
      }));

      const transformedEdges = data.relationships.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type,
        properties: edge.properties || {}
      }));

      const newGraphData = {
        nodes: transformedNodes,
        edges: transformedEdges,
        relationships: transformedEdges
      };
      
      console.log(`🔄 Setting graph data: ${newGraphData.nodes.length} nodes, ${newGraphData.relationships.length} relationships`);
      setGraphData(newGraphData);

    } catch (error) {
      console.error('❌ Error fetching initial data:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch schema information
  const fetchSchemaInfo = async () => {
    try {
      console.log('🔍 Fetching schema information...');
      
      const response = await fetch('http://localhost:8001/api/schema-info');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📊 Schema data received:', data);
      setSchemaInfo(data);

    } catch (error) {
      console.error('❌ Error fetching schema info:', error);
      // Use fallback schema info if API fails
      setSchemaInfo({
        labels: [
          { name: 'APIEndpoint', count: 0 },
          { name: 'Parameter', count: 0 },
          { name: 'BusinessProcess', count: 0 },
          { name: 'Keyword', count: 0 },
          { name: 'Root', count: 0 },
          { name: 'Path', count: 0 }
        ],
        relationshipTypes: [
          { name: 'HAS_CHILD', count: 0 }
        ]
      });
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchInitialData();
    fetchSchemaInfo();
  }, []);

  // Handle refresh
  const handleRefresh = async () => {
    await Promise.all([fetchInitialData(), fetchSchemaInfo()]);
  };

  // Filter graph data based on search and selections
  const filteredGraphData = useMemo(() => {
    let filteredNodes = graphData.nodes;
    let filteredEdges = graphData.edges;

    // Apply search filter
    if (searchTerm) {
      filteredNodes = filteredNodes.filter(node => {
        const searchLower = searchTerm.toLowerCase();
        return (
          node.name.toLowerCase().includes(searchLower) ||
          (node.description || '').toLowerCase().includes(searchLower) ||
          (node.labels && node.labels.some(label => 
            label.toLowerCase().includes(searchLower)
          )) ||
          Object.values(node.properties || {}).some(prop => 
            String(prop).toLowerCase().includes(searchLower)
          )
        );
      });
    }

    // Apply label filter
    if (selectedLabel) {
      filteredNodes = filteredNodes.filter(node => 
        node.labels && node.labels.includes(selectedLabel)
      );
    }

    // Apply relationship type filter
    if (selectedRelType) {
      filteredEdges = filteredEdges.filter(edge => edge.type === selectedRelType);
      
      // Only show nodes that have connections of the selected type
      const connectedNodeIds = new Set();
      filteredEdges.forEach(edge => {
        connectedNodeIds.add(edge.source);
        connectedNodeIds.add(edge.target);
      });
      
      filteredNodes = filteredNodes.filter(node => connectedNodeIds.has(node.id));
    } else {
      // Filter edges to only include those between visible nodes
      const nodeIds = new Set(filteredNodes.map(n => n.id));
      filteredEdges = filteredEdges.filter(edge => 
        nodeIds.has(edge.source) && nodeIds.has(edge.target)
      );
    }

    return {
      nodes: filteredNodes,
      edges: filteredEdges
    };
  }, [graphData, searchTerm, selectedLabel, selectedRelType]);

  // Handle node selection
  const handleNodeSelect = (node) => {
    setSelectedNode(node);
  };

  // Render loading state
  if (isLoading && graphData.nodes.length === 0) {
    return (
      <div className="kb-container">
        <div className="kb-loading">
          <div className="kb-loading-spinner"></div>
          <p>Loading knowledge base...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error && graphData.nodes.length === 0) {
    return (
      <div className="kb-container">
        <div className="kb-error-state">
          <FiDatabase className="kb-error-icon-large" />
          <h3>Cannot Connect to Database</h3>
          <p>{error}</p>
          <button className="kb-retry-btn" onClick={handleRefresh}>
            <FiRefreshCw />
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="kb-container">
      {/* Sidebar */}
      <Sidebar
        schemaInfo={schemaInfo}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedLabel={selectedLabel}
        setSelectedLabel={setSelectedLabel}
        selectedRelType={selectedRelType}
        setSelectedRelType={setSelectedRelType}
        onRefresh={handleRefresh}
        isLoading={isLoading}
      />

      {/* Main Graph Area */}
      <div className="kb-main-area">
        <div className="kb-graph-header">
          <div className="kb-graph-stats">
            <div className="kb-stat-item">
              <span className="kb-stat-value">{filteredGraphData.nodes.length}</span>
              <span className="kb-stat-label">Visible Nodes</span>
            </div>
            <div className="kb-stat-item">
              <span className="kb-stat-value">{filteredGraphData.edges.length}</span>
              <span className="kb-stat-label">Visible Edges</span>
            </div>
            <div className="kb-stat-item">
              <span className="kb-stat-value">{graphData.nodes.length}</span>
              <span className="kb-stat-label">Total Nodes</span>
            </div>
            <div className="kb-stat-item">
              <span className="kb-stat-value">{graphData.edges.length}</span>
              <span className="kb-stat-label">Total Edges</span>
            </div>
          </div>
          
          {(searchTerm || selectedLabel || selectedRelType) && (
            <div className="kb-active-filters">
              <span>Active filters:</span>
              {searchTerm && (
                <span className="kb-filter-tag">
                  Search: "{searchTerm}"
                  <button onClick={() => setSearchTerm('')}>×</button>
                </span>
              )}
              {selectedLabel && (
                <span className="kb-filter-tag">
                  Label: {selectedLabel}
                  <button onClick={() => setSelectedLabel(null)}>×</button>
                </span>
              )}
              {selectedRelType && (
                <span className="kb-filter-tag">
                  Type: {selectedRelType}
                  <button onClick={() => setSelectedRelType(null)}>×</button>
                </span>
              )}
            </div>
          )}
        </div>

        <div className="kb-graph-container">
          {filteredGraphData.nodes.length === 0 ? (
            <div className="kb-empty-state">
              <FiDatabase className="kb-empty-icon" />
              <h3>No Data Available</h3>
              <p>No nodes match your current filters or the database is empty.</p>
              {(searchTerm || selectedLabel || selectedRelType) && (
                <button 
                  className="kb-clear-filters-btn"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedLabel(null);
                    setSelectedRelType(null);
                  }}
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <D3Graph
              graphData={filteredGraphData}
              setGraphData={setGraphData}
              onNodeSelect={handleNodeSelect}
            />
          )}
        </div>
      </div>

      {/* Node Details Panel */}
      {selectedNode && (
        <div className="kb-details-panel">
          <div className="kb-panel-header">
            <h3>Node Details</h3>
            <button 
              className="kb-close-btn"
              onClick={() => setSelectedNode(null)}
            >
              <FiX />
            </button>
          </div>

          <div className="kb-node-details">
            <div className="kb-node-header">
              <div 
                className="kb-node-color" 
                style={{ 
                  backgroundColor: selectedNode.category === 'architecture' ? '#8b5cf6' :
                                   selectedNode.category === 'apis' ? '#06b6d4' :
                                   selectedNode.category === 'data' ? '#10b981' :
                                   selectedNode.category === 'services' ? '#f59e0b' :
                                   selectedNode.category === 'docs' ? '#ef4444' : '#6b7280'
                }}
              />
              <div className="kb-node-info">
                <h4>{selectedNode.name}</h4>
                <span className="kb-node-category">{selectedNode.category}</span>
              </div>
            </div>

            <div className="kb-node-content">
              <div className="kb-detail-section">
                <h5>ID</h5>
                <p>{selectedNode.id}</p>
              </div>

              <div className="kb-detail-section">
                <h5>Labels</h5>
                <div className="kb-labels-list">
                  {selectedNode.labels ? selectedNode.labels.map((label, idx) => (
                    <span key={idx} className="kb-label-tag">{label}</span>
                  )) : <span className="kb-no-data">No labels</span>}
                </div>
              </div>

              <div className="kb-detail-section">
                <h5>Description</h5>
                <p>{selectedNode.description}</p>
              </div>

              <div className="kb-detail-section">
                <h5>Properties</h5>
                <div className="kb-properties-list">
                  {selectedNode.properties && Object.keys(selectedNode.properties).length > 0 ? (
                    Object.entries(selectedNode.properties).map(([key, value]) => (
                      <div key={key} className="kb-property-item">
                        <span className="kb-property-key">{key}:</span>
                        <span className="kb-property-value">{String(value)}</span>
                      </div>
                    ))
                  ) : (
                    <span className="kb-no-data">No properties</span>
                  )}
                </div>
              </div>

              <div className="kb-detail-section">
                <h5>Connected Relationships</h5>
                <div className="kb-relationships-list">
                  {graphData.edges.filter(edge => 
                    edge.source === selectedNode.id || edge.target === selectedNode.id
                  ).map((edge, idx) => (
                    <div key={idx} className="kb-relationship-tag">
                      {edge.type}
                      <span className="kb-relationship-direction">
                        {edge.source === selectedNode.id ? '→' : '←'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBase; 