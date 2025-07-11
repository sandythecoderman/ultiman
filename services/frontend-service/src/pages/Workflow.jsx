import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
import { WORKFLOW_GENERATE_ENDPOINT } from '../config';

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
  const [messages, setMessages] = useState([]);
  const [isChatPanelCollapsed, setIsChatPanelCollapsed] = useState(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);
  const reactFlowWrapper = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

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

  useEffect(() => {
    const promptFromHome = location.state?.prompt;
    if (promptFromHome) {
      const userMessage = { sender: 'user', text: promptFromHome };
      
      // Update messages to show the user's prompt
      setMessages(prev => [...prev, userMessage]);

      // Define an async function to call the backend
      const fetchWorkflow = async () => {
        try {
          const agentResponse = await handleSendMessage({ query: promptFromHome });
          const agentMessage = {
            sender: 'agent',
            text: agentResponse.response || 'Sorry, I had trouble understanding that.',
          };
          setMessages(prev => [...prev, userMessage, agentMessage]);
          if (agentResponse.nodes && agentResponse.edges) {
            setNodes(agentResponse.nodes);
            setEdges(agentResponse.edges);
          }
        } catch (error) {
           const errorMessage = {
            sender: 'agent',
            text: error.message || 'Failed to fetch. Please check the backend logs.',
            isError: true,
          };
          setMessages(prev => [...prev, userMessage, errorMessage]);
        }
      };

      fetchWorkflow();
      
      // Clear the state to prevent re-triggering
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  const handleSendMessage = async (payload) => {
    const response = await fetch(WORKFLOW_GENERATE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
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

  const toggleRightPanel = () => {
    setIsRightPanelCollapsed(prev => !prev);
  };

  return (
    <div className="workflow-page">
      {/* The canvas is now the base layer */}
      <ReactFlowProvider>
        <div className="react-flow-container">
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
      </ReactFlowProvider>

      {/* Panels are now floating on top */}
      <div className={`left-panel-container ${isChatPanelCollapsed ? 'collapsed' : ''}`}>
        <div className="left-panel">
          <Chat
            messages={messages}
            onMessagesChange={setMessages}
            onSendMessage={handleSendMessage}
            placeholder="Describe the workflow you want to create..."
          />
        </div>
        <button onClick={toggleChatPanel} className="panel-toggle-button left">
          <FiChevronLeft size={20} />
        </button>
      </div>

      <div className={`right-panel-container ${isRightPanelCollapsed ? 'collapsed' : ''}`}>
        <div className="right-panel">
          {analysis ? (
            <AnalysisResults analysis={analysis} onClear={() => setAnalysis(null)} />
          ) : selectedNode ? (
            <NodeProperties node={selectedNode} onNodeDataChange={handleNodeDataChange} />
          ) : (
            <div className="placeholder">Select a node to see its properties or run an analysis.</div>
          )}
        </div>
        <button onClick={toggleRightPanel} className="panel-toggle-button right">
          <FiChevronRight size={20} />
        </button>
      </div>
    </div>
  );
};

export default Workflow; 