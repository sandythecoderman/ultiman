import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './KnowledgeBase.css';

const KnowledgeBase = () => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    const fetchGraphData = async () => {
      try {
        const response = await fetch('http://localhost:8001/knowledge_graph');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setNodes(data.nodes);
        setEdges(data.edges);
      } catch (error) {
        console.error("Could not fetch graph data:", error);
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
  };

  const nodeTypesList = [
    'Platform', 'Core Modules', 'Sub-modules & Services', 'API Endpoints'
  ];

  return (
    <div className="kb-page">
      <div className="kb-left-panel">
        <div className="kb-panel-section">
          <h3 className="kb-panel-title">Node Types</h3>
          <ul className="kb-node-types-list">
            {nodeTypesList.map(type => (
              <li key={type} className="kb-node-type-item">{type}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="kb-center-panel">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          fitView
        >
          <Background color="var(--sidebar-border)" gap={16} />
          <Controls />
        </ReactFlow>
      </div>
      <div className="kb-right-panel">
        <div className="kb-panel-section">
          <h3 className="kb-panel-title">Node Description</h3>
          <p className="kb-placeholder">
            {selectedNode ? selectedNode.data.label : 'No description available.'}
          </p>
        </div>
        <div className="kb-panel-section">
          <h3 className="kb-panel-title">Node Statistics</h3>
          <p className="kb-placeholder">
            {nodes.length} Nodes
          </p>
        </div>
        <div className="kb-panel-section">
          <h3 className="kb-panel-title">Selected Node</h3>
          <p className="kb-placeholder">
            {selectedNode ? selectedNode.id : 'Click on a node to see its details'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBase; 