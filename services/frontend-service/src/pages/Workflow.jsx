import React, { useState, useCallback, useRef, useEffect } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
} from 'reactflow';
import 'reactflow/dist/style.css';
import NodeProperties from '../components/NodeProperties';
import AnalysisResults from '../components/AnalysisResults';
import Chat from '../components/Chat';
import CustomNode from '../components/CustomNode';
import EmptyWorkflow from '../components/EmptyWorkflow';

const nodeTypes = {
  start: CustomNode,
  execute: CustomNode,
  process: CustomNode,
  end: CustomNode,
  default: CustomNode,
};

const Workflow = () => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [isChatPanelCollapsed, setIsChatPanelCollapsed] = useState(false);
  const reactFlowWrapper = useRef(null);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), []);

  const onNodeClick = (event, node) => {
    setSelectedNode(node);
    setAnalysis(null);
  };

  const handleSendMessage = async (query) => {
    const response = await fetch('http://localhost:8001/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    if (data.nodes && data.edges) {
      setNodes(data.nodes);
      setEdges(data.edges);
    }

    return data;
  };
  
  const handleNodeDataChange = (newData) => {
    if (!selectedNode) return;

    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === selectedNode.id) {
          const updatedData = { ...n.data, ...newData };
          return { ...n, data: updatedData };
        }
        return n;
      })
    );
  };

  const toggleChatPanel = () => {
    setIsChatPanelCollapsed(prev => !prev);
  };

  return (
    <div className="workflow-page">
      <div className={`left-panel ${isChatPanelCollapsed ? 'collapsed' : ''}`}>
        <Chat onSendMessage={handleSendMessage} />
      </div>
      <div className="center-panel">
        <button onClick={toggleChatPanel} className="panel-toggle-button">
          {isChatPanelCollapsed ? <FiChevronRight /> : <FiChevronLeft />}
        </button>
        {nodes.length === 0 ? (
          <EmptyWorkflow />
        ) : (
          <ReactFlow
            ref={reactFlowWrapper}
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            fitView
            nodeTypes={nodeTypes}
          >
            <Background />
            <Controls />
            <MiniMap nodeStrokeWidth={3} zoomable pannable />
          </ReactFlow>
        )}
      </div>
      <div className="right-panel">
        {analysis ? (
          <AnalysisResults analysis={analysis} onClear={() => setAnalysis(null)} />
        ) : selectedNode ? (
          <NodeProperties node={selectedNode} onNodeDataChange={handleNodeDataChange} />
        ) : (
          <div className="placeholder">Select a node to see its properties or run an analysis.</div>
        )}
      </div>
    </div>
  );
};

export default Workflow; 