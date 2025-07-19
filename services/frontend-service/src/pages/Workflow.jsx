import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './Workflow.css';
import NodeProperties from '../components/NodeProperties';
import AnalysisResults from '../components/AnalysisResults';
import Chat from '../components/Chat';
import CustomNode from '../components/CustomNode';
import EmptyWorkflow from '../components/EmptyWorkflow';
import ContextMenu from '../components/ContextMenu';
import NodeTemplates from '../components/NodeTemplates';
import { WORKFLOW_GENERATE_ENDPOINT } from '../config';
import { 
  FiMaximize, 
  FiMinimize, 
  FiDownload, 
  FiSettings, 
  FiPlay,
  FiX,
  FiGrid,
  FiMoreHorizontal
} from 'react-icons/fi';

const nodeTypes = {
  start: CustomNode,
  execute: CustomNode,
  process: CustomNode,
  end: CustomNode,
  default: CustomNode,
};

const Workflow = () => {
  const [nodes, setNodes] = useState([
    {
      id: 'start-1',
      type: 'start',
      position: { x: 100, y: 100 },
      data: { 
        label: 'Start Process',
        description: 'Initialize the workflow',
        status: 'completed'
      }
    },
    {
      id: 'process-1',
      type: 'process',
      position: { x: 300, y: 100 },
      data: { 
        label: 'Data Validation',
        description: 'Validate incoming data format',
        status: 'running'
      }
    },
    {
      id: 'execute-1',
      type: 'execute',
      position: { x: 500, y: 100 },
      data: { 
        label: 'API Call',
        description: 'Execute external API request',
        status: 'pending'
      }
    },
    {
      id: 'process-2',
      type: 'process',
      position: { x: 200, y: 250 },
      data: { 
        label: 'Error Handling',
        description: 'Handle validation errors',
        status: 'idle'
      }
    },
    {
      id: 'process-3',
      type: 'process',
      position: { x: 400, y: 250 },
      data: { 
        label: 'Data Transform',
        description: 'Transform API response data',
        status: 'idle'
      }
    },
    {
      id: 'execute-2',
      type: 'execute',
      position: { x: 600, y: 250 },
      data: { 
        label: 'Save Results',
        description: 'Store processed data',
        status: 'idle'
      }
    },
    {
      id: 'end-1',
      type: 'end',
      position: { x: 400, y: 400 },
      data: { 
        label: 'Complete',
        description: 'Workflow completed successfully',
        status: 'idle'
      }
    }
  ]);
  const [edges, setEdges] = useState([
    {
      id: 'e1',
      source: 'start-1',
      target: 'process-1',
      label: 'begin',
      type: 'smoothstep'
    },
    {
      id: 'e2',
      source: 'process-1',
      target: 'execute-1',
      label: 'valid',
      type: 'smoothstep'
    },
    {
      id: 'e3',
      source: 'process-1',
      target: 'process-2',
      label: 'error',
      type: 'smoothstep'
    },
    {
      id: 'e4',
      source: 'execute-1',
      target: 'process-3',
      label: 'success',
      type: 'smoothstep'
    },
    {
      id: 'e5',
      source: 'process-3',
      target: 'execute-2',
      label: 'transform',
      type: 'smoothstep'
    },
    {
      id: 'e6',
      source: 'execute-2',
      target: 'end-1',
      label: 'saved',
      type: 'smoothstep'
    },
    {
      id: 'e7',
      source: 'process-2',
      target: 'end-1',
      label: 'handled',
      type: 'smoothstep'
    }
  ]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [messages, setMessages] = useState([]);
  const [presentationMode, setPresentationMode] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    type: 'canvas',
    nodeData: null
  });
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

  // Template handlers
  const handleCreateWorkflow = (templateData) => {
    setNodes(templateData.nodes);
    setEdges(templateData.edges);
    setSelectedNode(null);
    console.log('Created workflow from template:', templateData.template.name);
  };

  const handleCreateNode = (nodeData) => {
    setNodes((nds) => [...nds, nodeData]);
    setSelectedNode(nodeData);
    console.log('Created node from template:', nodeData.type);
  };

  // Presentation mode handlers
  const togglePresentationMode = () => {
    setPresentationMode(!presentationMode);
    if (!presentationMode) {
      // Entering presentation mode
      document.body.style.overflow = 'hidden';
    } else {
      // Exiting presentation mode
      document.body.style.overflow = 'auto';
    }
  };

  // Context menu handlers
  const onPaneContextMenu = useCallback((event) => {
    event.preventDefault();
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      type: 'canvas',
      nodeData: null
    });
  }, []);

  const onNodeContextMenu = useCallback((event, node) => {
    event.preventDefault();
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      type: 'node',
      nodeData: node
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  }, []);

  // Generate unique node ID
  const generateNodeId = () => {
    return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Auto-layout algorithm using force-directed positioning
  const autoLayout = useCallback(() => {
    if (nodes.length === 0) return;

    const nodeWidth = 200;
    const nodeHeight = 80;
    const padding = 100;

    // Simple grid layout for demo
    const cols = Math.ceil(Math.sqrt(nodes.length));
    const newNodes = nodes.map((node, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      
      return {
        ...node,
        position: {
          x: col * (nodeWidth + padding),
          y: row * (nodeHeight + padding)
        }
      };
    });

    setNodes(newNodes);
  }, [nodes]);

  // Export workflow as image
  const exportAsImage = useCallback(() => {
    // Create a simple workflow export for demo
    const workflowData = {
      nodes: nodes.map(node => ({
        id: node.id,
        type: node.type,
        label: node.data.label,
        position: node.position
      })),
      edges: edges.map(edge => ({
        source: edge.source,
        target: edge.target
      })),
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(workflowData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges]);

  // Context menu action handler
  const handleContextAction = useCallback((action, data) => {
    console.log('Context action:', action, data);

    switch (action) {
      case 'create-node':
        const newNode = {
          id: generateNodeId(),
          type: data.type,
          position: { 
            x: contextMenu.x - (presentationMode ? 0 : 300), // Adjust for panel offset
            y: contextMenu.y - 100 
          },
          data: { 
            label: `${data.type.charAt(0).toUpperCase() + data.type.slice(1)} Node` 
          }
        };
        setNodes((nds) => [...nds, newNode]);
        break;

      case 'duplicate-node':
        if (data.nodeData) {
          const duplicatedNode = {
            ...data.nodeData,
            id: generateNodeId(),
            position: {
              x: data.nodeData.position.x + 50,
              y: data.nodeData.position.y + 50
            },
            data: {
              ...data.nodeData.data,
              label: `${data.nodeData.data.label} (Copy)`
            }
          };
          setNodes((nds) => [...nds, duplicatedNode]);
        }
        break;

      case 'delete-node':
        if (data.nodeData) {
          setNodes((nds) => nds.filter(node => node.id !== data.nodeData.id));
          setEdges((eds) => eds.filter(edge => 
            edge.source !== data.nodeData.id && edge.target !== data.nodeData.id
          ));
          if (selectedNode?.id === data.nodeData.id) {
            setSelectedNode(null);
          }
        }
        break;

      case 'edit-node':
        if (data.nodeData) {
          setSelectedNode(data.nodeData);
        }
        break;

      case 'test-node':
        if (data.nodeData) {
          console.log('Testing node:', data.nodeData.id);
          // Simulate node testing with status update
          setNodes((nds) => nds.map(node => 
            node.id === data.nodeData.id 
              ? { ...node, data: { ...node.data, status: 'running' } }
              : node
          ));
          
          // Simulate test completion after 2 seconds
          setTimeout(() => {
            setNodes((nds) => nds.map(node => 
              node.id === data.nodeData.id 
                ? { ...node, data: { ...node.data, status: 'completed' } }
                : node
            ));
          }, 2000);
        }
        break;

      case 'export-config':
        if (data.nodeData) {
          const nodeConfig = {
            id: data.nodeData.id,
            type: data.nodeData.type,
            data: data.nodeData.data,
            position: data.nodeData.position
          };
          const blob = new Blob([JSON.stringify(nodeConfig, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `node-${data.nodeData.id}-config.json`;
          a.click();
          URL.revokeObjectURL(url);
        }
        break;

      case 'auto-layout':
        autoLayout();
        break;

      case 'export-image':
        exportAsImage();
        break;

      case 'quick-connect':
        if (data.nodeData) {
          // Find the next available node to connect to
          const availableNodes = nodes.filter(node => 
            node.id !== data.nodeData.id && 
            !edges.some(edge => edge.source === data.nodeData.id && edge.target === node.id)
          );
          
          if (availableNodes.length > 0) {
            const targetNode = availableNodes[0];
            const newEdge = {
              id: `edge-${Date.now()}`,
              source: data.nodeData.id,
              target: targetNode.id,
              label: 'connects',
              type: 'smoothstep'
            };
            setEdges(eds => [...eds, newEdge]);
            console.log('Quick connected:', data.nodeData.id, 'to', targetNode.id);
          } else {
            console.log('No available nodes to connect to');
          }
        }
        break;

      default:
        console.log('Unknown action:', action);
    }
  }, [contextMenu, nodes, selectedNode, autoLayout, exportAsImage, presentationMode]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Ignore if typing in input fields
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }

      const isCtrl = event.ctrlKey || event.metaKey;
      
      switch (event.key) {
        case '1':
          if (!isCtrl) {
            handleContextAction('create-node', { type: 'start' });
            event.preventDefault();
          }
          break;
        case '2':
          if (!isCtrl) {
            handleContextAction('create-node', { type: 'execute' });
            event.preventDefault();
          }
          break;
        case '3':
          if (!isCtrl) {
            handleContextAction('create-node', { type: 'process' });
            event.preventDefault();
          }
          break;
        case '4':
          if (!isCtrl) {
            handleContextAction('create-node', { type: 'end' });
            event.preventDefault();
          }
          break;
        case 'l':
        case 'L':
          if (event.shiftKey) {
            autoLayout();
            event.preventDefault();
          }
          break;
        case 't':
        case 'T':
          if (isCtrl) {
            setShowTemplates(true);
            event.preventDefault();
          }
          break;
        case 'd':
        case 'D':
          if (isCtrl && selectedNode) {
            handleContextAction('duplicate-node', { nodeData: selectedNode });
            event.preventDefault();
          }
          break;
        case 'Delete':
        case 'Backspace':
          if (selectedNode && !isCtrl) {
            handleContextAction('delete-node', { nodeData: selectedNode });
            event.preventDefault();
          }
          break;
        case 'Escape':
          if (presentationMode) {
            togglePresentationMode();
          } else if (showTemplates) {
            setShowTemplates(false);
          } else {
            setSelectedNode(null);
            closeContextMenu();
          }
          break;
        case 'F11':
          togglePresentationMode();
          event.preventDefault();
          break;
        case 'f':
          if (isCtrl) {
            togglePresentationMode();
            event.preventDefault();
          }
          break;
        case 'e':
          if (isCtrl) {
            exportAsImage();
            event.preventDefault();
          }
          break;
        case 'a':
          if (isCtrl) {
            // Select all nodes
            setNodes(nds => nds.map(node => ({ ...node, selected: true })));
            event.preventDefault();
          }
          break;
        case 'r':
          if (isCtrl) {
            // Reset/clear workflow
            setNodes([]);
            setEdges([]);
            setSelectedNode(null);
            event.preventDefault();
          }
          break;
        case 'z':
          if (isCtrl && !event.shiftKey) {
            // Undo functionality placeholder
            console.log('Undo action');
            event.preventDefault();
          }
          break;
        case 'y':
          if (isCtrl) {
            // Redo functionality placeholder
            console.log('Redo action');
            event.preventDefault();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, handleContextAction, autoLayout, closeContextMenu, presentationMode, togglePresentationMode, showTemplates]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

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

  // Presentation mode component
  if (presentationMode) {
    return (
      <div className="wf-presentation-mode">
        {/* Minimal toolbar */}
        <div className="wf-presentation-toolbar">
          <div className="wf-presentation-title">
            <h2>Workflow Demo</h2>
            <span>{nodes.length} nodes</span>
          </div>
          <div className="wf-presentation-actions">
            <button onClick={autoLayout} title="Auto Layout">
              <FiSettings />
            </button>
            <button onClick={exportAsImage} title="Export">
              <FiDownload />
            </button>
            <button onClick={togglePresentationMode} title="Exit Presentation (Esc)">
              <FiX />
            </button>
          </div>
        </div>

        {/* Full-screen workflow */}
        <div className="wf-presentation-canvas">
          <ReactFlowProvider>
            {nodes.length === 0 ? (
              <div className="wf-presentation-empty">
                <h3>No Workflow to Display</h3>
                <p>Exit presentation mode to create your workflow</p>
              </div>
            ) : (
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onPaneContextMenu={onPaneContextMenu}
                onNodeContextMenu={onNodeContextMenu}
                fitView
                nodeTypes={nodeTypes}
              >
                <Background />
                <Controls />
              </ReactFlow>
            )}
          </ReactFlowProvider>
        </div>

        {/* Context Menu */}
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          visible={contextMenu.visible}
          type={contextMenu.type}
          nodeData={contextMenu.nodeData}
          onClose={closeContextMenu}
          onAction={handleContextAction}
        />
      </div>
    );
  }

  return (
    <div className="wf-container">
      {/* Left Panel - Chat */}
      <div className="wf-floating-panel wf-left-panel">
        <div className="wf-panel-header">
          <h3><FiSettings /> AI Assistant</h3>
          <div className="wf-panel-actions">
            <button 
              className="wf-panel-close"
              onClick={() => setShowActions(!showActions)}
              title="More actions"
            >
              <FiMoreHorizontal />
            </button>
            {showActions && (
              <div className="wf-actions-dropdown">
                <button onClick={() => setMessages([])}>Clear Chat</button>
                <button onClick={() => {
                  const chatData = {
                    timestamp: new Date().toISOString(),
                    messageCount: messages.length,
                    messages: messages
                  };
                  const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `workflow-chat-${Date.now()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}>Export</button>
              </div>
            )}
          </div>
        </div>
        <div className="wf-panel-content">
          <Chat
            messages={messages}
            onMessagesChange={setMessages}
            onSendMessage={handleSendMessage}
            placeholder="Describe the workflow you want to create..."
          />
        </div>
      </div>

      {/* Center Graph Area */}
      <div className="wf-main-area">
        <div className="wf-graph-container">
        {/* Graph toolbar */}
        <div className="wf-graph-toolbar">
          <div className="wf-graph-info">
            <span>{nodes.length} nodes • {edges.length} connections</span>
          </div>
          <div className="wf-graph-actions">
            <button onClick={() => setShowTemplates(true)} title="Templates (Ctrl+T)">
              <FiGrid />
            </button>
            <button onClick={autoLayout} title="Auto Layout (Shift+L)">
              <FiSettings />
            </button>
            <button onClick={exportAsImage} title="Export (Ctrl+E)">
              <FiDownload />
            </button>
            <button onClick={togglePresentationMode} title="Presentation Mode (Ctrl+F)">
              <FiMaximize />
            </button>
          </div>
        </div>

        <ReactFlowProvider>
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
              onPaneContextMenu={onPaneContextMenu}
              onNodeContextMenu={onNodeContextMenu}
              fitView
              nodeTypes={nodeTypes}
            >
              <Background />
              <Controls />
            </ReactFlow>
          )}
        </ReactFlowProvider>
        </div>
      </div>

      {/* Right Panel - Node Properties */}
      <div className="wf-floating-panel wf-right-panel">
        <div className="wf-panel-header">
          <h3><FiPlay /> Workflow Builder</h3>
        </div>
        <div className="wf-panel-content">
          {analysis ? (
            <AnalysisResults analysis={analysis} onClear={() => setAnalysis(null)} />
          ) : selectedNode ? (
            <NodeProperties node={selectedNode} onNodeDataChange={handleNodeDataChange} />
          ) : (
            <div className="wf-no-selection">
              <div className="wf-no-selection-icon">
                <FiPlay size={48} />
              </div>
              <h4>Agent Workflow Demo</h4>
              <p className="wf-no-selection-description">
                Select any node from the workflow to view its properties and configuration options.
              </p>
              
              <div className="wf-feature-preview">
                <h5>What you'll see:</h5>
                <div className="wf-preview-list">
                  <div className="wf-preview-item">
                    <FiSettings size={16} />
                    <div className="wf-preview-content">
                      <strong>Node Properties</strong>
                      <span>Configuration and settings</span>
                    </div>
                  </div>
                  <div className="wf-preview-item">
                    <FiPlay size={16} />
                    <div className="wf-preview-content">
                      <strong>Execution Details</strong>
                      <span>Runtime parameters and outputs</span>
                    </div>
                  </div>
                  <div className="wf-preview-item">
                    <FiGrid size={16} />
                    <div className="wf-preview-content">
                      <strong>Connection Info</strong>
                      <span>Input/output connections</span>
                    </div>
                  </div>
                  <div className="wf-preview-item">
                    <FiMaximize size={16} />
                    <div className="wf-preview-content">
                      <strong>Quick Actions</strong>
                      <span>Edit, duplicate, and manage nodes</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="wf-interaction-tips">
                <div className="wf-tip-item">
                  <FiSettings size={16} />
                  <div className="wf-tip-content">
                    <strong>Click:</strong>
                    <span>Select and configure nodes</span>
                  </div>
                </div>
                <div className="wf-tip-item">
                  <FiPlay size={16} />
                  <div className="wf-tip-content">
                    <strong>Chat:</strong>
                    <span>AI-powered workflow generation</span>
                  </div>
                </div>
              </div>

              <div className="wf-detail-section">
                <h5 className="wf-section-title">
                  <FiGrid size={16} />
                  Quick Actions
                </h5>
                <div className="wf-shortcuts-grid">
                  <div className="wf-shortcut-item">
                    <span>Create nodes</span><kbd>1-4</kbd>
                  </div>
                  <div className="wf-shortcut-item">
                    <span>Templates</span><kbd>Ctrl+T</kbd>
                  </div>
                  <div className="wf-shortcut-item">
                    <span>Auto-layout</span><kbd>Shift+L</kbd>
                  </div>
                  <div className="wf-shortcut-item">
                    <span>Presentation</span><kbd>Ctrl+F</kbd>
                  </div>
                  <div className="wf-shortcut-item">
                    <span>Context menu</span><kbd>Right-click</kbd>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Context Menu */}
      <ContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        visible={contextMenu.visible}
        type={contextMenu.type}
        nodeData={contextMenu.nodeData}
        onClose={closeContextMenu}
        onAction={handleContextAction}
      />

      {/* Node Templates */}
      <NodeTemplates
        visible={showTemplates}
        onClose={() => setShowTemplates(false)}
        onCreateWorkflow={handleCreateWorkflow}
        onCreateNode={handleCreateNode}
      />
    </div>
  );
};

export default Workflow; 