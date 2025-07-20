import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ReactFlow, {
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  useReactFlow,
  getBezierPath,
  getSmoothStepPath,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './Workflow.css';

import { 
  FiSettings, 
  FiPlay, 
  FiRefreshCw, 
  FiGrid, 
  FiDownload, 
  FiX, 
  FiPlus,
  FiTarget
} from 'react-icons/fi';

import CustomNode from '../components/CustomNode.jsx';
import NodeTemplates from '../components/NodeTemplates.jsx';
import Sidebar from '../components/Sidebar.jsx';
import DynamicForm from '../components/DynamicForm.jsx';
import EmptyWorkflow from '../components/EmptyWorkflow.jsx';
import AnalysisResults from '../components/AnalysisResults.jsx';
import CommandPalette from '../components/CommandPalette.jsx';
import Chat from '../components/Chat.jsx';
import ContextMenu from '../components/ContextMenu.jsx';
import NodeProperties from '../components/NodeProperties.jsx';

const nodeTypes = {
  custom: CustomNode,
  start: CustomNode,
  execute: CustomNode,
  process: CustomNode,
  end: CustomNode,
};

const createMockWorkflow = (query) => {
  // Create a mock workflow based on the query
  const steps = [
    {
      id: 'start-1',
      type: 'start',
      data: {
        label: 'Start Workflow',
        description: `Query: ${query}`,
        status: 'completed',
        icon: '▶'
      },
      style: {
        background: '#10b981',
        color: 'white',
        border: '2px solid #059669',
        borderRadius: '8px',
        padding: '10px',
        fontWeight: 'bold'
      }
    }
  ];

  // Add workflow steps based on query content
  if (query.toLowerCase().includes('create') && query.toLowerCase().includes('user')) {
    steps.push({
      id: 'step-1',
      type: 'execute',
      data: {
        label: 'Create Users',
        description: 'Create 5 new users with specified roles',
        status: 'pending',
        icon: '⚡',
        operation_id: 'create_users'
      },
      style: {
        background: '#3b82f6',
        color: 'white',
        border: '2px solid #2563eb',
        borderRadius: '8px',
        padding: '10px',
        fontWeight: 'bold'
      }
    });
  }

  if (query.toLowerCase().includes('requester')) {
    steps.push({
      id: 'step-2',
      type: 'execute',
      data: {
        label: 'Create Requesters',
        description: 'Create 3 requesters with appropriate permissions',
        status: 'pending',
        icon: '⚡',
        operation_id: 'create_requesters'
      },
      style: {
        background: '#3b82f6',
        color: 'white',
        border: '2px solid #2563eb',
        borderRadius: '8px',
        padding: '10px',
        fontWeight: 'bold'
      }
    });
  }

  if (query.toLowerCase().includes('authenticate')) {
    steps.push({
      id: 'step-3',
      type: 'execute',
      data: {
        label: 'Authenticate Users',
        description: 'Authenticate each user and verify access',
        status: 'pending',
        icon: '⚡',
        operation_id: 'authenticate_users'
      },
      style: {
        background: '#3b82f6',
        color: 'white',
        border: '2px solid #2563eb',
        borderRadius: '8px',
        padding: '10px',
        fontWeight: 'bold'
      }
    });
  }

  if (query.toLowerCase().includes('count') || query.toLowerCase().includes('active')) {
    steps.push({
      id: 'step-4',
      type: 'process',
      data: {
        label: 'Get Active Count',
        description: 'Retrieve and display active user count',
        status: 'pending',
        icon: '⟳',
        operation_id: 'get_active_count'
      },
      style: {
        background: '#8b5cf6',
        color: 'white',
        border: '2px solid #7c3aed',
        borderRadius: '8px',
        padding: '10px',
        fontWeight: 'bold'
      }
    });
  }

  // Add end step
  steps.push({
    id: 'end-1',
    type: 'end',
    data: {
      label: 'Complete',
      description: 'Workflow completed successfully',
      status: 'idle',
              icon: '■'
    },
    style: {
      background: '#ef4444',
      color: 'white',
      border: '2px solid #dc2626',
      borderRadius: '8px',
      padding: '10px',
      fontWeight: 'bold'
    }
  });

  // Create edges
  const edges = [];
  for (let i = 0; i < steps.length - 1; i++) {
    edges.push({
      id: `e-${steps[i].id}-${steps[i + 1].id}`,
      source: steps[i].id,
      target: steps[i + 1].id,
      type: 'smoothstep',
      animated: true,
      style: {
        stroke: '#3b82f6',
        strokeWidth: 2,
        strokeDasharray: '5,5'
      },
      label: `Step ${i + 1}`,
      labelStyle: {
        fill: '#3b82f6',
        fontWeight: 'bold',
        fontSize: '12px'
      }
    });
  }

  return {
    nodes: steps,
    edges: edges,
    summary: `Generated workflow for: ${query}`
  };
};

const WorkflowContent = () => {
  const location = useLocation();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    nodeId: null,
    nodeType: null,
    isCanvas: false
  });
  const [selectedNode, setSelectedNode] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionStatus, setExecutionStatus] = useState(null);
  const [workflowId, setWorkflowId] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [executionResults, setExecutionResults] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [query, setQuery] = useState('');
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  const reactFlowWrapper = useRef(null);
  const { project } = useReactFlow();

  // Animation state
  const [animatingNodes, setAnimatingNodes] = useState(new Set());
  const [animatingEdges, setAnimatingEdges] = useState(new Set());

  // Handle initial query from navigation
  useEffect(() => {
    if (location.state?.initialQuery) {
      setQuery(location.state.initialQuery);
      // Auto-generate workflow if query is provided
      setTimeout(() => {
        generateWorkflow(location.state.initialQuery);
      }, 500);
    }
    
    if (location.state?.workflowData) {
      // Use pre-generated workflow data
      const { nodes: workflowNodes, edges: workflowEdges } = location.state.workflowData;
      setNodes(workflowNodes);
      setEdges(workflowEdges);
    }
  }, [location.state]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'k':
            e.preventDefault();
            setShowCommandPalette(true);
            break;
          case 'Enter':
            e.preventDefault();
            if (query.trim()) {
              generateWorkflow();
            }
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [query]);



  const generateWorkflow = async (customQuery = null) => {
    const queryToUse = String(customQuery || query || '');
    if (!queryToUse.trim()) return;

    setIsGenerating(true);
    try {
      // Try to connect to backend first
      let data = null;
      try {
        const response = await fetch('http://localhost:8000/workflow/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: queryToUse.trim(),
          }),
        });

        if (response.ok) {
          data = await response.json();
        }
      } catch (backendError) {
        console.log('Backend not available, using mock workflow');
      }
      
      // Use mock workflow if backend is not available
      const mockWorkflow = createMockWorkflow(queryToUse);
      
      const transformedNodes = mockWorkflow.nodes.map((node, index) => ({
        ...node,
        position: {
          x: 100 + (index * 250),
          y: 100 + (index * 50),
        },
        data: {
          ...node.data,
          status: node.data.status || 'pending',
          isAnimating: false,
        },
        style: {
          ...node.style,
          opacity: 0,
          transform: 'scale(0.8)',
          transition: 'all 0.5s ease',
        },
      }));

      const transformedEdges = mockWorkflow.edges.map((edge, index) => ({
        ...edge,
        style: {
          ...edge.style,
          opacity: 0,
          strokeDasharray: edge.animated ? '5,5' : 'none',
          transition: 'all 0.5s ease',
        },
        animated: false,
      }));

      setNodes(transformedNodes);
      setEdges(transformedEdges);
      setWorkflowId(data.workflow_id || `workflow-${Date.now()}`);
      setTotalSteps(transformedNodes.length);
      setCurrentStep(0);
      setExecutionResults({});

      // Animate nodes and edges in sequence
      await animateWorkflowGeneration(transformedNodes, transformedEdges);

    } catch (error) {
      console.error('Error generating workflow:', error);
      alert('Failed to generate workflow. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const animateWorkflowGeneration = async (nodes, edges) => {
    // Animate nodes appearing one by one
    for (let i = 0; i < nodes.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setNodes(prevNodes => 
        prevNodes.map((node, index) => 
          index === i 
            ? {
                ...node,
                style: {
                  ...node.style,
                  opacity: 1,
                  transform: 'scale(1)',
                },
                data: {
                  ...node.data,
                  isAnimating: true,
                },
              }
            : node
        )
      );

      // Animate corresponding edge
      if (i < edges.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setEdges(prevEdges =>
          prevEdges.map((edge, index) =>
            index === i
              ? {
                  ...edge,
                  style: {
                    ...edge.style,
                    opacity: 1,
                  },
                  animated: edge.animated !== false,
                }
              : edge
          )
        );
      }

      // Stop animation after a delay
      setTimeout(() => {
        setNodes(prevNodes =>
          prevNodes.map((node, index) =>
            index === i
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    isAnimating: false,
                  },
                }
              : node
          )
        );
      }, 1000);
    }
  };

  const executeWorkflow = async () => {
    if (!workflowId || nodes.length === 0) return;

    setIsExecuting(true);
    setExecutionStatus('running');
    setCurrentStep(0);
    setExecutionResults({});

    try {
      const response = await fetch('http://localhost:8000/workflow/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflow_id: workflowId,
          nodes: nodes,
          edges: edges,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to execute workflow');
      }

      const data = await response.json();
      
      // Start polling for execution status
      pollExecutionStatus(workflowId);

    } catch (error) {
      console.error('Error executing workflow:', error);
      setExecutionStatus('failed');
      alert('Failed to execute workflow. Please try again.');
    }
  };

  const pollExecutionStatus = async (workflowId) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:8000/workflow/status/${workflowId}`);
        
        if (response.ok) {
          const status = await response.json();
          
          setCurrentStep(status.current_step);
          setExecutionResults(status.results || {});
          
          // Update node statuses and animations
          updateNodeStatuses(status.results || {});
          
          if (status.status === 'completed' || status.status === 'failed') {
            setExecutionStatus(status.status);
            setIsExecuting(false);
            clearInterval(pollInterval);
            
            if (status.status === 'completed') {
              setShowResults(true);
            }
          }
        }
      } catch (error) {
        console.error('Error polling execution status:', error);
        clearInterval(pollInterval);
        setExecutionStatus('failed');
        setIsExecuting(false);
      }
    }, 1000);
  };

  const updateNodeStatuses = (results) => {
    setNodes(prevNodes =>
      prevNodes.map(node => {
        const result = results[node.id];
        if (result) {
          return {
            ...node,
            data: {
              ...node.data,
              status: result.status,
              result: result.result,
              error: result.error,
              isAnimating: result.status === 'running',
            },
            style: {
              ...node.style,
              ...getNodeStatusStyle(result.status),
            },
          };
        }
        return node;
      })
    );

    // Update edge animations
    setEdges(prevEdges =>
      prevEdges.map((edge, index) => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        
        if (sourceNode && targetNode) {
          const sourceResult = results[sourceNode.id];
          const targetResult = results[targetNode.id];
          
          if (sourceResult && sourceResult.status === 'completed') {
            return {
              ...edge,
              style: {
                ...edge.style,
                stroke: '#10b981',
                strokeWidth: 3,
              },
              animated: false,
            };
          } else if (targetResult && targetResult.status === 'running') {
            return {
              ...edge,
              style: {
                ...edge.style,
                stroke: '#3b82f6',
                strokeWidth: 2,
              },
              animated: true,
            };
          }
        }
        return edge;
      })
    );
  };

  const getNodeStatusStyle = (status) => {
    const styles = {
      pending: {
        background: '#6b7280',
        border: '#4b5563',
      },
      running: {
        background: '#3b82f6',
        border: '#2563eb',
        boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)',
      },
      completed: {
        background: '#10b981',
        border: '#059669',
        boxShadow: '0 0 20px rgba(16, 185, 129, 0.5)',
      },
      failed: {
        background: '#ef4444',
        border: '#dc2626',
        boxShadow: '0 0 20px rgba(239, 68, 68, 0.5)',
      },
    };
    return styles[status] || styles.pending;
  };

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
  }, []);

  const onNodeDragStop = useCallback(
    (event, node, nodes) => {
      setNodes(nodes);
    },
    [setNodes],
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');
      const position = project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode = {
        id: `${type}-${Date.now()}`,
        type: 'custom',
        position,
        data: {
          label: type.charAt(0).toUpperCase() + type.slice(1),
          type: type,
          status: 'pending',
        },
        style: {
          background: '#3b82f6',
          color: 'white',
          border: '2px solid #2563eb',
          borderRadius: '8px',
          padding: '10px',
          fontWeight: 'bold',
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [project, setNodes],
  );

  const handleNodeUpdate = useCallback((nodeId, data) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              ...data,
            },
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  const handleNodeDelete = useCallback((nodeId) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
  }, [setNodes, setEdges, selectedNode]);

  // Context menu handlers
  const onNodeContextMenu = useCallback((event, node) => {
    event.preventDefault();
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      nodeId: node.id,
      nodeType: node.type,
      isCanvas: false
    });
  }, []);

  const onPaneContextMenu = useCallback((event) => {
    event.preventDefault();
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      nodeId: null,
      nodeType: null,
      isCanvas: true
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  }, []);

  // Handle click outside to close context menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (contextMenu.visible) {
        closeContextMenu();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu.visible, closeContextMenu]);

  const handleContextMenuAction = useCallback((action, nodeId) => {
    switch (action) {
      case 'add-start':
        addNode('start', contextMenu.x, contextMenu.y);
        break;
      case 'add-execute':
        addNode('execute', contextMenu.x, contextMenu.y);
        break;
      case 'add-process':
        addNode('process', contextMenu.x, contextMenu.y);
        break;
      case 'add-decision':
        addNode('decision', contextMenu.x, contextMenu.y);
        break;
      case 'add-end':
        addNode('end', contextMenu.x, contextMenu.y);
        break;
      case 'add-custom':
        addNode('custom', contextMenu.x, contextMenu.y);
        break;
      case 'edit':
        if (nodeId) {
          setSelectedNode(nodes.find(n => n.id === nodeId));
        }
        break;
      case 'duplicate':
        if (nodeId) {
          duplicateNode(nodeId);
        }
        break;
      case 'delete':
        if (nodeId) {
          deleteNode(nodeId);
        }
        break;
      case 'copy':
        if (nodeId) {
          copyNode(nodeId);
        }
        break;
      case 'parameters':
        if (nodeId) {
          setSelectedNode(nodes.find(n => n.id === nodeId));
        }
        break;
      case 'status':
        if (nodeId) {
          changeNodeStatus(nodeId);
        }
        break;
      case 'connect':
        if (nodeId) {
          startConnection(nodeId);
        }
        break;
      case 'details':
        if (nodeId) {
          setSelectedNode(nodes.find(n => n.id === nodeId));
        }
        break;
      case 'clear':
        clearWorkflow();
        break;
      case 'arrange':
        autoArrangeNodes();
        break;
      case 'export':
        exportWorkflow();
        break;
      case 'import':
        importWorkflow();
        break;
      default:
        console.log('Unknown action:', action);
    }
  }, [contextMenu, nodes]);

  // Node manipulation functions
  const addNode = (type, x, y) => {
    const newNode = {
      id: `${type}-${Date.now()}`,
      type: type,
      position: { x: x - 100, y: y - 50 },
      data: {
        label: `${type.charAt(0).toUpperCase() + type.slice(1)} Node`,
        description: `A ${type} node`,
        status: 'idle',
        icon: getNodeIcon(type),
        parameters: {}
      },
      style: getNodeStyle(type)
    };
    setNodes(prev => [...prev, newNode]);
  };

  const duplicateNode = (nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      const newNode = {
        ...node,
        id: `${node.type}-${Date.now()}`,
        position: {
          x: node.position.x + 50,
          y: node.position.y + 50
        }
      };
      setNodes(prev => [...prev, newNode]);
    }
  };

  const deleteNode = (nodeId) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId));
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
  };

  const copyNode = (nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      navigator.clipboard.writeText(JSON.stringify(node));
    }
  };

  const changeNodeStatus = (nodeId) => {
    const statuses = ['idle', 'pending', 'running', 'completed', 'failed'];
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      const currentIndex = statuses.indexOf(node.data.status);
      const nextStatus = statuses[(currentIndex + 1) % statuses.length];
      setNodes(prev => prev.map(n => 
        n.id === nodeId 
          ? { ...n, data: { ...n.data, status: nextStatus } }
          : n
      ));
    }
  };

  const startConnection = (nodeId) => {
    // This would typically start a connection mode
    console.log('Starting connection from node:', nodeId);
  };

  const autoArrangeNodes = () => {
    // Simple auto-arrange logic
    const arrangedNodes = nodes.map((node, index) => ({
      ...node,
      position: {
        x: 100 + (index * 200),
        y: 100 + (Math.floor(index / 3) * 150)
      }
    }));
    setNodes(arrangedNodes);
  };

  const exportWorkflow = () => {
    const workflowData = { nodes, edges };
    const blob = new Blob([JSON.stringify(workflowData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workflow.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importWorkflow = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const workflowData = JSON.parse(e.target.result);
            setNodes(workflowData.nodes || []);
            setEdges(workflowData.edges || []);
          } catch (error) {
            console.error('Error importing workflow:', error);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const getNodeIcon = (type) => {
    const icons = {
      start: '▶',
      execute: '⚡',
      process: '⟳',
      decision: '?',
      end: '■',
      custom: '⚙'
    };
    return icons[type] || '⚙';
  };

  const getNodeStyle = (type) => {
    const styles = {
      start: {
        background: '#10b981',
        color: 'white',
        border: '2px solid #059669',
        borderRadius: '8px',
        padding: '10px',
        fontWeight: 'bold'
      },
      execute: {
        background: '#3b82f6',
        color: 'white',
        border: '2px solid #2563eb',
        borderRadius: '8px',
        padding: '10px',
        fontWeight: 'bold'
      },
      process: {
        background: '#8b5cf6',
        color: 'white',
        border: '2px solid #7c3aed',
        borderRadius: '8px',
        padding: '10px',
        fontWeight: 'bold'
      },
      decision: {
        background: '#f59e0b',
        color: 'white',
        border: '2px solid #d97706',
        borderRadius: '8px',
        padding: '10px',
        fontWeight: 'bold'
      },
      end: {
        background: '#ef4444',
        color: 'white',
        border: '2px solid #dc2626',
        borderRadius: '8px',
        padding: '10px',
        fontWeight: 'bold'
      },
      custom: {
        background: '#6b7280',
        color: 'white',
        border: '2px solid #4b5563',
        borderRadius: '8px',
        padding: '10px',
        fontWeight: 'bold'
      }
    };
    return styles[type] || styles.custom;
  };

  const handleNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
  }, []);

  const handleChatMessage = async (message) => {
    setIsChatLoading(true);
    
    // Add user message to chat
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    
    try {
      // Check if this is a workflow-related query
      const workflowKeywords = ['create', 'generate', 'workflow', 'process', 'execute', 'automate', 'user', 'ticket', 'asset', 'event'];
      const isWorkflowQuery = workflowKeywords.some(keyword => message.toLowerCase().includes(keyword));
      
      if (isWorkflowQuery) {
        // Generate workflow from chat message
        await generateWorkflow(message);
        
        const botMessage = {
          id: Date.now() + 1,
          type: 'bot',
          content: `I've generated a workflow for: "${message}". You can see it in the canvas and execute it when ready.`,
          timestamp: new Date().toISOString()
        };
        
        setChatMessages(prev => [...prev, botMessage]);
      } else {
        // Regular chat response
        const response = await fetch('http://localhost:8000/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: message,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          
          const botMessage = {
            id: Date.now() + 1,
            type: 'bot',
            content: data.response || 'I processed your request successfully.',
            timestamp: new Date().toISOString(),
            nodes: data.nodes,
            edges: data.edges
          };
          
          setChatMessages(prev => [...prev, botMessage]);
          
          // If the response includes workflow data, update the canvas
          if (data.nodes && data.edges) {
            setNodes(data.nodes);
            setEdges(data.edges);
          }
        } else {
          const botMessage = {
            id: Date.now() + 1,
            type: 'bot',
            content: 'I encountered an error processing your request. Please try again.',
            timestamp: new Date().toISOString()
          };
          
          setChatMessages(prev => [...prev, botMessage]);
        }
      }
    } catch (error) {
      console.error('Error processing chat message:', error);
      
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: 'I encountered an error. Please try again.',
        timestamp: new Date().toISOString()
      };
      
      setChatMessages(prev => [...prev, botMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const clearWorkflow = () => {
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
    setWorkflowId(null);
    setCurrentStep(0);
    setTotalSteps(0);
    setExecutionResults({});
    setShowResults(false);
    setExecutionStatus(null);
    setQuery('');
    setChatMessages([]);
  };

  const getEdgePath = (sourceX, sourceY, targetX, targetY) => {
    return getSmoothStepPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
    });
  };

  const customEdge = ({ sourceX, sourceY, targetX, targetY, ...props }) => {
    const [edgePath] = getEdgePath(sourceX, sourceY, targetX, targetY);
    return (
      <path
        d={edgePath}
        stroke="#3b82f6"
        strokeWidth={2}
        fill="none"
        style={{
          strokeDasharray: props.animated ? '5,5' : 'none',
          animation: props.animated ? 'dash 1s linear infinite' : 'none',
        }}
      />
    );
  };

  const edgeTypes = {
    custom: customEdge,
  };

  return (
    <div className="wf-container">
      {/* LEFT PANEL - CHAT */}
      <div className="wf-left-panel">
        <div className="wf-panel-header">
          <h3>AI Agent Chat</h3>
          <div className="wf-panel-actions">
            <button onClick={clearWorkflow} className="wf-panel-close">
              Clear All
            </button>
          </div>
        </div>
        
        <div className="wf-panel-content">
          <Chat 
            messages={chatMessages.map(msg => ({
              sender: msg.type === 'user' ? 'user' : 'agent',
              text: msg.content,
              timestamp: msg.timestamp,
              isError: msg.type === 'error'
            }))}
            onMessagesChange={(newMessages) => {
              setChatMessages(newMessages.map(msg => ({
                id: Date.now() + Math.random(),
                type: msg.sender === 'user' ? 'user' : 'bot',
                content: msg.text,
                timestamp: msg.timestamp
              })));
            }}
            onSendMessage={async (payload) => {
              try {
                const response = await fetch('http://localhost:8000/chat', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    query: payload.query,
                  }),
                });

                if (response.ok) {
                  const data = await response.json();
                  
                  // If the response includes workflow data, update the canvas
                  if (data.nodes && data.edges) {
                    setNodes(data.nodes);
                    setEdges(data.edges);
                  }
                  
                  return { response: data.response || 'I processed your request successfully.' };
                } else {
                  return { response: 'I encountered an error processing your request. Please try again.' };
                }
              } catch (error) {
                console.error('Error processing chat message:', error);
                return { response: 'I encountered an error. Please try again.' };
              }
            }}
            placeholder="Ask me to create workflows, modify nodes, or help with anything..."
          />
          
          {executionStatus && (
            <div className={`execution-status ${executionStatus}`}>
              <div className="status-info">
                <span className="status-text">
                  {executionStatus === 'running' ? 'Executing...' : 
                   executionStatus === 'completed' ? 'Completed!' : 
                   executionStatus === 'failed' ? 'Failed!' : 'Unknown'}
                </span>
                {executionStatus === 'running' && (
                  <span className="step-info">
                    Step {currentStep + 1} of {totalSteps}
                  </span>
                )}
              </div>
              {executionStatus === 'running' && (
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CENTER PANEL - GRAPH CANVAS */}
      <div className="wf-main-area">
        <div className="wf-graph-container">
                      <div className="wf-graph-toolbar">
              <div className="wf-graph-info">
                <FiSettings className="toolbar-icon" />
                Workflow Canvas
                {nodes.length > 0 && (
                  <span className="node-count">
                    {nodes.length} node{nodes.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="wf-graph-actions">
                {nodes.length > 0 && (
                  <>
                    <button
                      onClick={executeWorkflow}
                      disabled={isExecuting}
                      title="Execute Workflow"
                      className="action-btn execute-btn"
                    >
                      {isExecuting ? <FiRefreshCw /> : <FiPlay />}
                    </button>
                    <button 
                      onClick={autoArrangeNodes} 
                      title="Auto Arrange Nodes"
                      className="action-btn arrange-btn"
                    >
                      <FiGrid />
                    </button>
                    <button 
                      onClick={exportWorkflow} 
                      title="Export Workflow"
                      className="action-btn export-btn"
                    >
                      <FiDownload />
                    </button>
                    <button 
                      onClick={clearWorkflow} 
                      title="Clear Workflow"
                      className="action-btn clear-btn"
                    >
                      <FiX />
                    </button>
                  </>
                )}
                {nodes.length === 0 && (
                  <button 
                    onClick={() => generateWorkflow('Create a simple workflow')} 
                    title="Generate Sample Workflow"
                    className="action-btn sample-btn"
                  >
                    <FiPlus />
                  </button>
                )}
              </div>
            </div>
          
          <div className="wf-react-flow" ref={reactFlowWrapper}>
            {nodes.length === 0 ? (
              <EmptyWorkflow onGenerate={generateWorkflow} />
            ) : (
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={handleNodeClick}
                onNodeContextMenu={onNodeContextMenu}
                onPaneContextMenu={onPaneContextMenu}
                onNodeDragStop={onNodeDragStop}
                onDragOver={onDragOver}
                onDrop={onDrop}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                attributionPosition="bottom-left"
              >
                <Controls className="wf-controls" />
                <Background />
                <MiniMap className="wf-minimap" />
              </ReactFlow>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - NODE DETAILS */}
      <div className="wf-right-panel">
        <NodeProperties 
          selectedNode={selectedNode} 
          onNodeUpdate={handleNodeUpdate}
        />
      </div>

      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onGenerate={generateWorkflow}
        query={query}
        setQuery={setQuery}
      />

      {/* Context Menu */}
      {contextMenu.visible && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
          onAction={handleContextMenuAction}
          nodeId={contextMenu.nodeId}
          nodeType={contextMenu.nodeType}
          isCanvas={contextMenu.isCanvas}
        />
      )}
    </div>
  );
};

const Workflow = () => {
  return (
    <ReactFlowProvider>
      <WorkflowContent />
    </ReactFlowProvider>
  );
};

export default Workflow; 