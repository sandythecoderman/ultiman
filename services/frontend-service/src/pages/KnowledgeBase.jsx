import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import NodeTypes from '../components/NodeTypes';
import NodeStatistics from '../components/NodeStatistics';
import SelectedNode from '../components/SelectedNode';
import NodeDescription from '../components/NodeDescription';

const typeColors = {
  'Platform': '#00A9FF',
  'Core Modules': '#FF007F',
  'Sub-modules & Services': '#FFA500',
  'API Endpoints': '#32CD32',
  'Unknown': '#808080'
};

const KnowledgeBase = () => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    const fetchGraphData = async () => {
      try {
        const response = await fetch('http://localhost:8000/knowledge_graph');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        const styledNodes = data.nodes.map(node => ({
          ...node,
          style: { 
            background: typeColors[node.data.type] || typeColors['Unknown'], 
            color: 'white' 
          },
        }));

        setNodes(styledNodes);
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

  return (
    <div className="workflow-page">
      <div className="left-panel">
        <h2>Node Types</h2>
        <NodeTypes />
      </div>
      <div className="center-panel" style={{ height: '100%', padding: 0 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
      <div className="right-panel">
        <h2>Node Description</h2>
        <NodeDescription node={selectedNode} />
        <h2 style={{marginTop: '1rem'}}>Node Statistics</h2>
        <NodeStatistics nodes={nodes} />
        <h2 style={{marginTop: '1rem'}}>Selected Node</h2>
        <SelectedNode node={selectedNode} />
      </div>
    </div>
  );
};

export default KnowledgeBase; 