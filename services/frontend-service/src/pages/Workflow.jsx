import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
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
import FloatingToolbar from '../components/FloatingToolbar';
import EnhancedNode from '../components/EnhancedNode';
import MonitoringDashboard from '../components/MonitoringDashboard';
import WorkflowTemplates from '../components/WorkflowTemplates';
import DataIntegrationHub from '../components/DataIntegrationHub';
import SystemVisualizer3D from '../components/SystemVisualizer3D';
import { WORKFLOW_GENERATE_ENDPOINT, API_BASE_URL } from '../config';
import { 
  FiMaximize, 
  FiMinimize, 
  FiDownload, 
  FiSettings, 
  FiPlay,
  FiX,
  FiGrid,
  FiMoreHorizontal,
  FiSave,
  FiRotateCcw,
  FiZap,
  FiActivity,
  FiDatabase,
  FiEye,
  FiEyeOff
} from 'react-icons/fi';

// Temporary fallback node type for debugging
const FallbackNode = ({ data }) => {
  console.log('FallbackNode rendering with data:', data);
  return (
    <div style={{ 
      background: '#fff', 
      border: '1px solid #ccc', 
      padding: '10px', 
      borderRadius: '4px',
      minWidth: '100px'
    }}>
      <div>Type: {data?.type || 'unknown'}</div>
      <div>Label: {data?.label || 'No label'}</div>
      <div>Status: {data?.status || 'unknown'}</div>
    </div>
  );
};

const nodeTypes = {
  default: FallbackNode,
  enhanced: EnhancedNode,
};

const Workflow = () => {
  // Add debugging to see what's happening
  console.log('Workflow component rendering...');
  
  // Minimal test nodes
  const [nodes, setNodes, onNodesChange] = useNodesState([
    {
      id: '1',
      type: 'default',
      position: { x: 100, y: 100 },
      data: { label: 'Test Node' }
    }
  ]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [messages, setMessages] = useState([]);
  const [presentationMode, setPresentationMode] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [workflowName, setWorkflowName] = useState('Untitled Workflow');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionStep, setExecutionStep] = useState(0);
  const [showMonitoring, setShowMonitoring] = useState(false);
  const [showWorkflowTemplates, setShowWorkflowTemplates] = useState(false);
  const [showDataHub, setShowDataHub] = useState(false);
  const [showSystemVisualizer, setShowSystemVisualizer] = useState(false);
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
    setWorkflowName(templateData.name);
    console.log('Created workflow from template:', templateData.name);
  };

  const handleCreateNode = (nodeData) => {
    setNodes((nds) => [...nds, nodeData]);
    setSelectedNode(nodeData);
    console.log('Created node from template:', nodeData.type);
  };

  const handleAddNode = (nodeData) => {
    setNodes((nds) => [...nds, nodeData]);
    setSelectedNode(nodeData);
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

  // Export workflow as JSON
  const exportWorkflow = useCallback(() => {
    const workflowData = {
      name: workflowName,
      nodes: nodes.map(node => ({
        id: node.id,
        type: node.type,
        label: node.data.label,
        description: node.data.description,
        position: node.position,
        status: node.data.status
      })),
      edges: edges.map(edge => ({
        source: edge.source,
        target: edge.target,
        label: edge.label,
        type: edge.type
      })),
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(workflowData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflowName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges, workflowName]);

  // Execute workflow
  const executeWorkflow = useCallback(async () => {
    if (isExecuting) return;
    
    setIsExecuting(true);
    setExecutionStep(0);
    
    // Find start nodes
    const startNodes = nodes.filter(node => node.type === 'start');
    
    for (let i = 0; i < startNodes.length; i++) {
      const startNode = startNodes[i];
      
      // Update start node status
      setNodes(prev => prev.map(node => 
        node.id === startNode.id 
          ? { ...node, data: { ...node.data, status: 'running' } }
          : node
      ));
      
      setExecutionStep(i + 1);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate workflow execution
      const executionOrder = getExecutionOrder(startNode.id);
      
      for (let j = 0; j < executionOrder.length; j++) {
        const nodeId = executionOrder[j];
        
        // Update node status to running
        setNodes(prev => prev.map(node => 
          node.id === nodeId 
            ? { ...node, data: { ...node.data, status: 'running' } }
            : node
        ));
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Update node status to completed
        setNodes(prev => prev.map(node => 
          node.id === nodeId 
            ? { ...node, data: { ...node.data, status: 'completed' } }
            : node
        ));
      }
    }
    
    setIsExecuting(false);
    setExecutionStep(0);
  }, [nodes, edges, isExecuting]);

  // Get execution order based on connections
  const getExecutionOrder = (startNodeId) => {
    const order = [];
    const visited = new Set();
    
    const traverse = (nodeId) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      
      const outgoingEdges = edges.filter(edge => edge.source === nodeId);
      for (const edge of outgoingEdges) {
        traverse(edge.target);
      }
      order.push(nodeId);
    };
    
    traverse(startNodeId);
    return order.reverse().slice(1); // Remove start node
  };

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
            label: `${data.type.charAt(0).toUpperCase() + data.type.slice(1)} Node`,
            description: `Add ${data.type} functionality`,
            status: 'pending'
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

      default:
        break;
    }
    closeContextMenu();
  }, [contextMenu, presentationMode, selectedNode, closeContextMenu]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (presentationMode) return;

      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 't':
            event.preventDefault();
            setShowTemplates(true);
            break;
          case 'e':
            event.preventDefault();
            exportWorkflow();
            break;
          case 'f':
            event.preventDefault();
            togglePresentationMode();
            break;
          case 's':
            event.preventDefault();
            // Save workflow (implement later)
            console.log('Save workflow');
            break;
          default:
            break;
        }
      } else if (event.shiftKey) {
        switch (event.key) {
          case 'L':
            event.preventDefault();
            autoLayout();
            break;
          default:
            break;
        }
      } else {
        switch (event.key) {
          case 'Escape':
            if (showTemplates) {
              setShowTemplates(false);
            } else if (contextMenu.visible) {
              closeContextMenu();
            }
            break;
          default:
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [presentationMode, showTemplates, contextMenu.visible, closeContextMenu, exportWorkflow, togglePresentationMode, autoLayout]);

  // Load workflow from URL params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const workflowId = params.get('workflow');
    
    if (workflowId) {
      const fetchWorkflow = async () => {
        try {
          // Simulate fetching workflow data
          console.log('Loading workflow:', workflowId);
          // In real implementation, fetch from API
        } catch (error) {
          console.error('Error loading workflow:', error);
        }
      };
      
      fetchWorkflow();
    }
  }, [location]);

  // Chat message handler
  const handleSendMessage = async (payload) => {
    try {
      console.log('Sending message to backend:', payload);
      
      const response = await fetch(`${API_BASE_URL}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: payload.query || payload
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Backend response:', data);
      
      // Check if this is a workflow creation response
      if (data.response && data.response.includes('workflow has been generated')) {
        console.log('Workflow creation detected, generating workflow...');
        
        // Call the workflow generation endpoint
        const workflowResponse = await fetch(`${API_BASE_URL}/workflow/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: payload.query || payload
          }),
        });

        if (workflowResponse.ok) {
          const workflowData = await workflowResponse.json();
          console.log('Workflow generated:', workflowData);
          
          // Update the workflow with the generated nodes and edges
          if (workflowData.nodes && workflowData.edges) {
            setNodes(workflowData.nodes);
            setEdges(workflowData.edges);
            console.log('Workflow updated with generated nodes and edges');
          }
          
          // Return the original response but with workflow data
          return {
            ...data,
            workflowGenerated: true,
            workflowData: workflowData
          };
        }
      }
      
      return data;
    } catch (error) {
      console.error('Error calling backend API:', error);
      throw error;
    }
  };

  // Node data change handler
  const handleNodeDataChange = (newData) => {
    if (selectedNode) {
      setNodes(prev => prev.map(node => 
        node.id === selectedNode.id 
          ? { ...node, data: { ...node.data, ...newData } }
          : node
      ));
      setSelectedNode(prev => ({ ...prev, data: { ...prev.data, ...newData } }));
    }
  };

  // Presentation mode render
  if (presentationMode) {
    return (
      <div className="wf-presentation-mode">
        {/* Minimal toolbar */}
        <div className="wf-presentation-toolbar">
          <div className="wf-presentation-title">
            <h2>{workflowName}</h2>
            <span>{nodes.length} nodes • {edges.length} connections</span>
            {isExecuting && (
              <span className="execution-status">
                <FiZap className="spinning" /> Executing... Step {executionStep}
              </span>
            )}
          </div>
          <div className="wf-presentation-actions">
            <button onClick={autoLayout} title="Auto Layout">
              <FiSettings />
            </button>
            <button onClick={exportWorkflow} title="Export">
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
                onError={(error) => {
                  console.error('ReactFlow presentation error:', error);
                }}
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
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="workflow-name-input"
              placeholder="Enter workflow name..."
            />
            <span>{nodes.length} nodes • {edges.length} connections</span>
            {isExecuting && (
              <span className="execution-status">
                <FiZap className="spinning" /> Executing... Step {executionStep}
              </span>
            )}
          </div>
          <div className="wf-graph-actions">
            <button 
              onClick={executeWorkflow} 
              disabled={isExecuting}
              className={isExecuting ? 'executing' : ''}
              title="Execute Workflow"
            >
              <FiPlay />
            </button>
            <button onClick={() => setShowTemplates(true)} title="Node Templates (Ctrl+T)">
              <FiGrid />
            </button>
            <button onClick={() => setShowWorkflowTemplates(true)} title="Workflow Templates">
              <FiZap />
            </button>
            <button onClick={() => setShowDataHub(true)} title="Data Integration Hub">
              <FiDatabase />
            </button>
            <button onClick={() => setShowMonitoring(!showMonitoring)} title="System Monitor">
              {showMonitoring ? <FiEyeOff /> : <FiEye />}
            </button>
            <button onClick={() => setShowSystemVisualizer(true)} title="3D System Visualizer">
              <FiActivity />
            </button>
            <button onClick={autoLayout} title="Auto Layout (Shift+L)">
              <FiSettings />
            </button>
            <button onClick={exportWorkflow} title="Export (Ctrl+E)">
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
              onError={(error) => {
                console.error('ReactFlow error:', error);
              }}
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

      {/* Floating Toolbar */}
      <FloatingToolbar
        onAddNode={handleAddNode}
        onShowTemplates={() => setShowTemplates(true)}
        onAutoLayout={autoLayout}
        onExport={exportWorkflow}
        onTogglePresentation={togglePresentationMode}
        isPresentationMode={presentationMode}
      />

      {/* Templates Modal */}
      {showTemplates && (
        <NodeTemplates
          onClose={() => setShowTemplates(false)}
          onCreateWorkflow={handleCreateWorkflow}
          onCreateNode={handleCreateNode}
        />
      )}

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

      {/* Monitoring Dashboard */}
      <MonitoringDashboard 
        isVisible={showMonitoring}
        onToggle={() => setShowMonitoring(!showMonitoring)}
      />

      {/* Workflow Templates */}
      <WorkflowTemplates
        isVisible={showWorkflowTemplates}
        onClose={() => setShowWorkflowTemplates(false)}
        onApplyTemplate={(templateData) => {
          setNodes(templateData.nodes);
          setEdges(templateData.edges);
          setShowWorkflowTemplates(false);
        }}
      />

      {/* Data Integration Hub */}
      <DataIntegrationHub
        isVisible={showDataHub}
        onClose={() => setShowDataHub(false)}
      />

      {/* 3D System Visualizer */}
      <SystemVisualizer3D
        isVisible={showSystemVisualizer}
        onClose={() => setShowSystemVisualizer(false)}
      />
    </div>
  );
};

export default Workflow; 