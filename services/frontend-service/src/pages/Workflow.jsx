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
} from 'reactflow';
import 'reactflow/dist/style.css';
import './Workflow.css';

import CustomNode from '../components/CustomNode.jsx';
import NodeTemplates from '../components/NodeTemplates.jsx';
import Sidebar from '../components/Sidebar.jsx';
import DynamicForm from '../components/DynamicForm.jsx';
import EmptyWorkflow from '../components/EmptyWorkflow.jsx';
import AnalysisResults from '../components/AnalysisResults.jsx';
import CommandPalette from '../components/CommandPalette.jsx';

const nodeTypes = {
  custom: CustomNode,
};

const Workflow = () => {
  const location = useLocation();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
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
    const queryToUse = customQuery || query;
    if (!queryToUse.trim()) return;

    setIsGenerating(true);
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

      if (!response.ok) {
        throw new Error('Failed to generate workflow');
      }

      const data = await response.json();
      
      // Transform the workflow data to ReactFlow format with animations
      const transformedNodes = data.nodes.map((node, index) => ({
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

      const transformedEdges = data.edges.map((edge, index) => ({
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
      setWorkflowId(data.workflow_id);
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
    <div className="workflow-container">
      <div className="workflow-header">
        <div className="workflow-title">
          <h1>Workflow Builder</h1>
          <p>Create and execute automated workflows with AI-powered generation</p>
        </div>
        
        <div className="workflow-controls">
          <div className="query-input-container">
            <input
              type="text"
              placeholder="Describe your workflow (e.g., 'Create 5 users and 3 tickets')"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="query-input"
              disabled={isGenerating || isExecuting}
            />
            <button
              onClick={generateWorkflow}
              disabled={!query.trim() || isGenerating || isExecuting}
              className="generate-btn"
            >
              {isGenerating ? 'Generating...' : 'Generate Workflow'}
            </button>
          </div>
          
          {nodes.length > 0 && (
            <div className="execution-controls">
              <button
                onClick={executeWorkflow}
                disabled={isExecuting}
                className="execute-btn"
              >
                {isExecuting ? 'Executing...' : 'Execute Workflow'}
              </button>
              <button onClick={clearWorkflow} className="clear-btn">
                Clear
              </button>
            </div>
          )}
        </div>

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

      <div className="workflow-content">
        <Sidebar
          selectedNode={selectedNode}
          onNodeUpdate={handleNodeUpdate}
          onNodeDelete={handleNodeDelete}
        />
        
        <div className="workflow-canvas-container" ref={reactFlowWrapper}>
          {nodes.length === 0 ? (
            <EmptyWorkflow onGenerate={generateWorkflow} />
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onNodeDragStop={onNodeDragStop}
              onDragOver={onDragOver}
              onDrop={onDrop}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
              attributionPosition="bottom-left"
            >
              <Controls />
              <Background />
              <MiniMap />
            </ReactFlow>
          )}
        </div>

        {showResults && (
          <AnalysisResults
            results={executionResults}
            onClose={() => setShowResults(false)}
          />
        )}
      </div>

      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onGenerate={generateWorkflow}
        query={query}
        setQuery={setQuery}
      />

      <style jsx>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -10;
          }
        }
      `}</style>
    </div>
  );
};

export default Workflow; 