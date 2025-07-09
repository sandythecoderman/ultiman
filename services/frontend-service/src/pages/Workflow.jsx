import React, { useState, useCallback } from 'react';
import ReactFlow, {
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import StatelessChat from '../components/StatelessChat';

const initialNodes = [
  { id: '1', position: { x: 250, y: 5 }, data: { label: 'Start' }, type: 'input' },
  { id: '2', position: { x: 250, y: 125 }, data: { label: 'Step 1' } },
  { id: '3', position: { x: 250, y: 250 }, data: { label: 'Step 2' } },
  { id: '4', position: { x: 250, y: 375 }, data: { label: 'End' }, type: 'output' },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e2-3', source: '2', target: '3', animated: true },
  { id: 'e3-4', source: '3', target: '4', animated: true },
];

const Workflow = () => {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [thinkingPipeline, setThinkingPipeline] = useState([]);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), []);

  return (
    <div className="workflow-page">
      <div className="left-panel">
        <h2>Your Workflow</h2>
        <StatelessChat onReasoningUpdate={setThinkingPipeline} />
      </div>
      <div className="center-panel">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
      <div className="right-panel">
        <h2>Thinking Pipeline</h2>
        <div className="thinking-pipeline-content">
          {thinkingPipeline.map((step, index) => (
            <div key={index} className="pipeline-step">
              {step}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Workflow; 