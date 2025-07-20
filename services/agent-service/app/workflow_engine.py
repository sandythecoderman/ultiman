import asyncio
import json
import logging
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from enum import Enum
import sys
import os

# Add the legacy agent to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'legacy_agent'))

from legacy_agent.agent.agent import UnifiedOrchestratorAgent
from legacy_agent.agent.data_models import FinalOutput, JSONOutputNode

logger = logging.getLogger(__name__)

class NodeStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"

class ExecutionStatus(Enum):
    IDLE = "idle"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    PAUSED = "paused"

@dataclass
class WorkflowNode:
    id: str
    type: str
    position: Dict[str, int]
    data: Dict[str, Any]
    status: NodeStatus = NodeStatus.PENDING
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    execution_time: Optional[float] = None
    dependencies: List[str] = None

@dataclass
class WorkflowEdge:
    id: str
    source: str
    target: str
    animated: bool = False
    style: Optional[Dict[str, Any]] = None

@dataclass
class WorkflowExecution:
    id: str
    nodes: List[WorkflowNode]
    edges: List[WorkflowEdge]
    status: ExecutionStatus = ExecutionStatus.IDLE
    current_step: int = 0
    total_steps: int = 0
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    results: Dict[str, Any] = None

class WorkflowEngine:
    """
    Enhanced workflow engine that integrates the legacy agent with smooth animations
    and sequential execution tracking.
    """
    
    def __init__(self):
        self.agent = UnifiedOrchestratorAgent()
        self.active_executions: Dict[str, WorkflowExecution] = {}
        
    def generate_workflow_from_query(self, query: str) -> Dict[str, Any]:
        """
        Generate a workflow from a natural language query using the legacy agent.
        """
        try:
            logger.info(f"Generating workflow for query: {query}")
            
            # Use the legacy agent to generate the workflow
            agent_result = self.agent.run(query)
            
            # Convert agent output to ReactFlow format with animations
            workflow_data = self._convert_agent_output_to_reactflow(agent_result, query)
            
            logger.info(f"Generated workflow with {len(workflow_data['nodes'])} nodes")
            return workflow_data
            
        except Exception as e:
            logger.error(f"Error generating workflow: {str(e)}")
            # Return a fallback workflow
            return self._create_fallback_workflow(query, str(e))
    
    def _convert_agent_output_to_reactflow(self, agent_result: FinalOutput, original_query: str) -> Dict[str, Any]:
        """
        Convert the agent's output to ReactFlow format with proper animations and styling.
        """
        nodes = []
        edges = []
        
        # Create start node
        start_node = {
            'id': 'start-1',
            'type': 'start',
            'position': {'x': 100, 'y': 100},
            'data': {
                'label': 'Start Workflow',
                'description': f'Query: {original_query}',
                'status': 'completed',
                'icon': '🚀'
            },
            'style': {
                'background': '#10b981',
                'color': 'white',
                'border': '2px solid #059669',
                'borderRadius': '8px',
                'padding': '10px',
                'fontWeight': 'bold'
            }
        }
        nodes.append(start_node)
        
        # Convert agent's visual pipeline to ReactFlow nodes
        if hasattr(agent_result, 'visual_pipeline') and agent_result.visual_pipeline:
            pipeline_nodes = agent_result.visual_pipeline.get('nodes', [])
            
            for i, pipeline_node in enumerate(pipeline_nodes):
                node_id = f"step-{i+1}"
                
                # Determine node type based on operation
                node_type = self._determine_node_type(pipeline_node.get('operation_id', ''))
                
                # Create node with appropriate styling and animations
                node = {
                    'id': node_id,
                    'type': node_type,
                    'position': {'x': 300 + (i * 200), 'y': 100 + (i * 50)},
                    'data': {
                        'label': pipeline_node.get('description', 'Execute Step'),
                        'description': pipeline_node.get('reasoning', ''),
                        'status': 'pending',
                        'operation_id': pipeline_node.get('operation_id', ''),
                        'parameters': pipeline_node.get('parameters', {}),
                        'icon': self._get_node_icon(node_type),
                        'api_details': pipeline_node.get('api_details', {})
                    },
                    'style': self._get_node_style(node_type, 'pending'),
                    'className': f'workflow-node {node_type} pending'
                }
                nodes.append(node)
                
                # Create edge from previous node
                if i == 0:
                    source_id = 'start-1'
                else:
                    source_id = f"step-{i}"
                
                edge = {
                    'id': f"e-{source_id}-{node_id}",
                    'source': source_id,
                    'target': node_id,
                    'type': 'smoothstep',
                    'animated': True,
                    'style': {
                        'stroke': '#3b82f6',
                        'strokeWidth': 2,
                        'strokeDasharray': '5,5'
                    },
                    'label': f'Step {i+1}',
                    'labelStyle': {
                        'fill': '#3b82f6',
                        'fontWeight': 'bold',
                        'fontSize': '12px'
                    }
                }
                edges.append(edge)
        
        # Create end node
        end_node = {
            'id': 'end-1',
            'type': 'end',
            'position': {'x': 300 + (len(nodes) * 200), 'y': 100},
            'data': {
                'label': 'Complete',
                'description': 'Workflow completed successfully',
                'status': 'idle',
                'icon': '✅'
            },
            'style': {
                'background': '#ef4444',
                'color': 'white',
                'border': '2px solid #dc2626',
                'borderRadius': '8px',
                'padding': '10px',
                'fontWeight': 'bold'
            }
        }
        nodes.append(end_node)
        
        # Create final edge
        if nodes:
            final_edge = {
                'id': f"e-final",
                'source': nodes[-2]['id'] if len(nodes) > 1 else 'start-1',
                'target': 'end-1',
                'type': 'smoothstep',
                'animated': True,
                'style': {
                    'stroke': '#10b981',
                    'strokeWidth': 3,
                    'strokeDasharray': '10,5'
                },
                'label': 'Complete',
                'labelStyle': {
                    'fill': '#10b981',
                    'fontWeight': 'bold',
                    'fontSize': '12px'
                }
            }
            edges.append(final_edge)
        
        return {
            'nodes': nodes,
            'edges': edges,
            'summary': agent_result.summary_text if hasattr(agent_result, 'summary_text') else original_query
        }
    
    def _determine_node_type(self, operation_id: str) -> str:
        """
        Determine the ReactFlow node type based on the operation ID.
        """
        operation_lower = operation_id.lower()
        
        if 'create' in operation_lower or 'add' in operation_lower:
            return 'execute'
        elif 'get' in operation_lower or 'fetch' in operation_lower or 'retrieve' in operation_lower:
            return 'process'
        elif 'update' in operation_lower or 'modify' in operation_lower:
            return 'execute'
        elif 'delete' in operation_lower or 'remove' in operation_lower:
            return 'execute'
        elif 'authenticate' in operation_lower or 'login' in operation_lower:
            return 'execute'
        elif 'analyze' in operation_lower or 'calculate' in operation_lower:
            return 'process'
        else:
            return 'execute'
    
    def _get_node_icon(self, node_type: str) -> str:
        """
        Get appropriate icon for each node type.
        """
        icons = {
            'start': '🚀',
            'execute': '⚡',
            'process': '🔍',
            'end': '✅'
        }
        return icons.get(node_type, '⚙️')
    
    def _get_node_style(self, node_type: str, status: str) -> Dict[str, Any]:
        """
        Get appropriate styling for each node type and status.
        """
        base_style = {
            'borderRadius': '8px',
            'padding': '12px',
            'fontWeight': 'bold',
            'textAlign': 'center',
            'minWidth': '120px',
            'boxShadow': '0 2px 4px rgba(0,0,0,0.1)',
            'transition': 'all 0.3s ease'
        }
        
        # Status-based colors
        status_colors = {
            'pending': {'background': '#6b7280', 'color': 'white', 'border': '#4b5563'},
            'running': {'background': '#3b82f6', 'color': 'white', 'border': '#2563eb'},
            'completed': {'background': '#10b981', 'color': 'white', 'border': '#059669'},
            'failed': {'background': '#ef4444', 'color': 'white', 'border': '#dc2626'},
            'idle': {'background': '#f3f4f6', 'color': '#374151', 'border': '#d1d5db'}
        }
        
        # Type-specific styling
        type_styles = {
            'start': {'background': '#10b981', 'color': 'white', 'border': '#059669'},
            'execute': {'background': '#3b82f6', 'color': 'white', 'border': '#2563eb'},
            'process': {'background': '#8b5cf6', 'color': 'white', 'border': '#7c3aed'},
            'end': {'background': '#ef4444', 'color': 'white', 'border': '#dc2626'}
        }
        
        # Combine type and status styles
        style = {**base_style, **type_styles.get(node_type, {})}
        if status != 'idle':
            style.update(status_colors.get(status, status_colors['pending']))
        
        return style
    
    def _create_fallback_workflow(self, query: str, error: str) -> Dict[str, Any]:
        """
        Create a fallback workflow when agent generation fails.
        """
        return {
            'nodes': [
                {
                    'id': 'start-1',
                    'type': 'start',
                    'position': {'x': 100, 'y': 100},
                    'data': {
                        'label': 'Start Workflow',
                        'description': f'Query: {query}',
                        'status': 'completed',
                        'icon': '🚀'
                    },
                    'style': {
                        'background': '#10b981',
                        'color': 'white',
                        'border': '2px solid #059669',
                        'borderRadius': '8px',
                        'padding': '10px',
                        'fontWeight': 'bold'
                    }
                },
                {
                    'id': 'error-1',
                    'type': 'process',
                    'position': {'x': 300, 'y': 100},
                    'data': {
                        'label': 'Error in Generation',
                        'description': f'Failed to generate workflow: {error}',
                        'status': 'failed',
                        'icon': '❌'
                    },
                    'style': {
                        'background': '#ef4444',
                        'color': 'white',
                        'border': '2px solid #dc2626',
                        'borderRadius': '8px',
                        'padding': '10px',
                        'fontWeight': 'bold'
                    }
                }
            ],
            'edges': [
                {
                    'id': 'e-start-error',
                    'source': 'start-1',
                    'target': 'error-1',
                    'type': 'smoothstep',
                    'animated': True,
                    'style': {
                        'stroke': '#ef4444',
                        'strokeWidth': 2,
                        'strokeDasharray': '5,5'
                    }
                }
            ],
            'summary': f'Failed to generate workflow: {error}'
        }
    
    async def execute_workflow(self, workflow_id: str, nodes: List[Dict], edges: List[Dict]) -> WorkflowExecution:
        """
        Execute a workflow with smooth sequential animations.
        """
        execution = WorkflowExecution(
            id=workflow_id,
            nodes=[WorkflowNode(**node) for node in nodes],
            edges=[WorkflowEdge(**edge) for edge in edges],
            status=ExecutionStatus.RUNNING,
            total_steps=len(nodes),
            start_time=asyncio.get_event_loop().time(),
            results={}
        )
        
        self.active_executions[workflow_id] = execution
        
        try:
            # Execute nodes in sequence with delays for smooth animation
            for i, node in enumerate(execution.nodes):
                if node.type in ['start', 'end']:
                    continue
                
                execution.current_step = i
                node.status = NodeStatus.RUNNING
                
                # Simulate execution with delay for smooth animation
                await asyncio.sleep(2)  # 2 seconds per step
                
                # Execute the node (simulate API call)
                result = await self._execute_node(node)
                
                if result['success']:
                    node.status = NodeStatus.COMPLETED
                    node.result = result['data']
                    execution.results[node.id] = result['data']
                else:
                    node.status = NodeStatus.FAILED
                    node.error = result['error']
                
                node.execution_time = asyncio.get_event_loop().time() - execution.start_time
                
                # Update edge animation
                if i < len(execution.edges):
                    execution.edges[i].animated = False
                    execution.edges[i].style = {
                        'stroke': '#10b981' if node.status == NodeStatus.COMPLETED else '#ef4444',
                        'strokeWidth': 3
                    }
            
            execution.status = ExecutionStatus.COMPLETED
            execution.end_time = asyncio.get_event_loop().time()
            
        except Exception as e:
            logger.error(f"Error executing workflow {workflow_id}: {str(e)}")
            execution.status = ExecutionStatus.FAILED
            execution.end_time = asyncio.get_event_loop().time()
        
        return execution
    
    async def _execute_node(self, node: WorkflowNode) -> Dict[str, Any]:
        """
        Execute a single workflow node (simulate API call).
        """
        try:
            # Simulate API call based on operation_id
            operation_id = node.data.get('operation_id', '')
            
            # Add realistic delays and responses based on operation type
            if 'create' in operation_id.lower():
                await asyncio.sleep(1.5)  # Simulate creation time
                return {
                    'success': True,
                    'data': {
                        'message': f'Successfully created {operation_id}',
                        'id': f'created_{node.id}',
                        'timestamp': asyncio.get_event_loop().time()
                    }
                }
            elif 'get' in operation_id.lower():
                await asyncio.sleep(0.8)  # Simulate retrieval time
                return {
                    'success': True,
                    'data': {
                        'message': f'Retrieved data for {operation_id}',
                        'count': 5,
                        'items': ['item1', 'item2', 'item3', 'item4', 'item5']
                    }
                }
            else:
                await asyncio.sleep(1.0)  # Default execution time
                return {
                    'success': True,
                    'data': {
                        'message': f'Executed {operation_id} successfully',
                        'result': 'success'
                    }
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_execution_status(self, workflow_id: str) -> Optional[WorkflowExecution]:
        """
        Get the current status of a workflow execution.
        """
        return self.active_executions.get(workflow_id)
    
    def stop_execution(self, workflow_id: str):
        """
        Stop a workflow execution.
        """
        if workflow_id in self.active_executions:
            execution = self.active_executions[workflow_id]
            execution.status = ExecutionStatus.PAUSED
            logger.info(f"Stopped workflow execution: {workflow_id}")

# Global workflow engine instance
workflow_engine = WorkflowEngine() 