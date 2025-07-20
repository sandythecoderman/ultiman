from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import logging
import os
import uuid
from typing import Optional, Dict, List, Any
from app.core.orchestrator import AgentOrchestrator
from app.tools.knowledge_graph_querier import KnowledgeGraphQuerier
from app.tools.neo4j_service import neo4j_service
from app.workflow_engine import workflow_engine, WorkflowExecution
from fastapi.responses import JSONResponse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Ultiman Agent Service",
    description="Enhanced agentic pipeline with workflow generation and execution",
    version="2.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOADS_DIR = "uploads"
if not os.path.exists(UPLOADS_DIR):
    os.makedirs(UPLOADS_DIR)

class ChatRequest(BaseModel):
    query: str
    session_id: Optional[str] = None
    file_info: Optional[Dict[str, str]] = None

class ChatResponse(BaseModel):
    response: str
    session_id: str
    tools_used: list[str] = []
    reasoning_steps: list[str] = []
    nodes: Optional[list] = None
    edges: Optional[list] = None

class WorkflowRequest(BaseModel):
    query: str
    session_id: Optional[str] = None

class WorkflowResponse(BaseModel):
    workflow_id: str
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    summary: str
    status: str = "generated"

class WorkflowExecutionRequest(BaseModel):
    workflow_id: str
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]

class WorkflowExecutionResponse(BaseModel):
    execution_id: str
    status: str
    current_step: int
    total_steps: int
    results: Dict[str, Any]
    message: str

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "agent-service-v2"}

@app.post("/uploadfile/")
async def create_upload_file(file: UploadFile = File(...)):
    file_path = os.path.join(UPLOADS_DIR, file.filename)
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(await file.read())
        logger.info(f"✅ File saved: {file.filename}")
        return JSONResponse(
            status_code=200,
            content={
                "message": "File uploaded successfully",
                "filename": file.filename,
            },
        )
    except Exception as e:
        logger.error(f"❌ Error saving file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Could not save file: {e}")

@app.post("/workflow/generate", response_model=WorkflowResponse)
async def generate_workflow(request: WorkflowRequest):
    """
    Generate a workflow from a natural language query using the legacy agent.
    """
    try:
        logger.info(f"🚀 Generating workflow for query: {request.query}")
        
        # Generate workflow using the new workflow engine
        workflow_data = workflow_engine.generate_workflow_from_query(request.query)
        
        # Create a unique workflow ID
        workflow_id = str(uuid.uuid4())
        
        logger.info(f"✅ Generated workflow {workflow_id} with {len(workflow_data['nodes'])} nodes")
        
        return WorkflowResponse(
            workflow_id=workflow_id,
            nodes=workflow_data['nodes'],
            edges=workflow_data['edges'],
            summary=workflow_data.get('summary', request.query),
            status="generated"
        )
        
    except Exception as e:
        logger.error(f"❌ Error generating workflow: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate workflow: {str(e)}")

@app.post("/workflow/execute", response_model=WorkflowExecutionResponse)
async def execute_workflow(request: WorkflowExecutionRequest):
    """
    Execute a workflow with smooth sequential animations.
    """
    try:
        logger.info(f"🚀 Executing workflow: {request.workflow_id}")
        
        # Execute the workflow
        execution = await workflow_engine.execute_workflow(
            request.workflow_id,
            request.nodes,
            request.edges
        )
        
        # Convert execution results to response format
        results = {}
        for node in execution.nodes:
            if node.result:
                results[node.id] = {
                    'status': node.status.value,
                    'result': node.result,
                    'execution_time': node.execution_time,
                    'error': node.error
                }
        
        return WorkflowExecutionResponse(
            execution_id=execution.id,
            status=execution.status.value,
            current_step=execution.current_step,
            total_steps=execution.total_steps,
            results=results,
            message=f"Workflow execution {execution.status.value}"
        )
        
    except Exception as e:
        logger.error(f"❌ Error executing workflow: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to execute workflow: {str(e)}")

@app.get("/workflow/status/{workflow_id}")
async def get_workflow_status(workflow_id: str):
    """
    Get the current status of a workflow execution.
    """
    try:
        execution = workflow_engine.get_execution_status(workflow_id)
        
        if not execution:
            raise HTTPException(status_code=404, detail="Workflow execution not found")
        
        # Convert execution to response format
        results = {}
        for node in execution.nodes:
            results[node.id] = {
                'status': node.status.value,
                'result': node.result,
                'execution_time': node.execution_time,
                'error': node.error
            }
        
        return {
            'execution_id': execution.id,
            'status': execution.status.value,
            'current_step': execution.current_step,
            'total_steps': execution.total_steps,
            'start_time': execution.start_time,
            'end_time': execution.end_time,
            'results': results
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting workflow status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get workflow status: {str(e)}")

@app.post("/workflow/stop/{workflow_id}")
async def stop_workflow(workflow_id: str):
    """
    Stop a workflow execution.
    """
    try:
        workflow_engine.stop_execution(workflow_id)
        return {"message": f"Workflow {workflow_id} stopped successfully"}
        
    except Exception as e:
        logger.error(f"❌ Error stopping workflow: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to stop workflow: {str(e)}")

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Enhanced chat endpoint that can generate workflows for workflow-related queries.
    """
    try:
        logger.info(f"🚀 Received query: {request.query}")
        
        # Check if this is a workflow-related query
        workflow_keywords = ['create', 'generate', 'workflow', 'process', 'execute', 'automate']
        is_workflow_query = any(keyword in request.query.lower() for keyword in workflow_keywords)
        
        if is_workflow_query:
            # Generate workflow instead of regular chat response
            workflow_data = workflow_engine.generate_workflow_from_query(request.query)
            
            return ChatResponse(
                response=f"Generated workflow for: {request.query}",
                session_id=request.session_id or str(uuid.uuid4()),
                tools_used=["WorkflowGenerator"],
                reasoning_steps=["Analyzed query for workflow generation", "Generated workflow steps"],
                nodes=workflow_data['nodes'],
                edges=workflow_data['edges']
            )
        
        # Fall back to regular chat processing
        file_path = None
        if request.file_info and 'filename' in request.file_info:
            filename = request.file_info['filename']
            # Security: Ensure the file is within the UPLOADS_DIR
            safe_path = os.path.abspath(os.path.join(UPLOADS_DIR, filename))
            if os.path.commonpath([safe_path, os.path.abspath(UPLOADS_DIR)]) != os.path.abspath(UPLOADS_DIR):
                raise HTTPException(status_code=400, detail="Invalid filename.")
            
            if os.path.exists(safe_path):
                file_path = safe_path
            else:
                logger.warning(f"⚠️ File specified but not found: {filename}")

        orchestrator = AgentOrchestrator()
        
        session_result = await orchestrator.process_query(
            request.query, 
            request.session_id,
            file_path=file_path
        )
        
        # Format reasoning steps for response
        reasoning_steps = [
            f"{step.step_type}: {step.content[:100]}..." if len(step.content) > 100 else f"{step.step_type}: {step.content}"
            for step in session_result.reasoning_steps
        ]
        
        nodes, edges = None, None
        # If the KG was queried, or if the query implies a workflow, return a graph
        if "KnowledgeGraphQuerier" in session_result.tools_used:
            graph_data = await get_knowledge_graph()
            nodes = graph_data.get("nodes")
            edges = graph_data.get("edges")
        elif 'create' in request.query.lower() or 'generate' in request.query.lower():
            # This is a mock graph generation for demonstration.
            # A real implementation would involve the LLM generating these steps.
            nodes = [
                {'id': '1', 'position': {'x': 250, 'y': 25}, 'data': {'label': 'Start Workflow'}, 'type': 'start'},
                {'id': '2', 'position': {'x': 250, 'y': 150}, 'data': {'label': f'Execute: {request.query}'}, 'type': 'execute'},
                {'id': '3', 'position': {'x': 250, 'y': 275}, 'data': {'label': 'Process Results'}, 'type': 'process'},
                {'id': '4', 'position': {'x': 250, 'y': 400}, 'data': {'label': 'End Workflow'}, 'type': 'end'},
            ]
            edges = [
                {'id': 'e1-2', 'source': '1', 'target': '2', 'animated': True},
                {'id': 'e2-3', 'source': '2', 'target': '3', 'animated': True},
                {'id': 'e3-4', 'source': '3', 'target': '4', 'animated': True},
            ]

        return ChatResponse(
            response=session_result.final_response or "I was unable to process your request.",
            session_id=session_result.session_id,
            tools_used=session_result.tools_used,
            reasoning_steps=reasoning_steps,
            nodes=nodes,
            edges=edges,
        )
        
    except Exception as e:
        logger.error(f"❌ Error processing chat request: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/knowledge_graph")
async def get_knowledge_graph():
    """
    Get complete Neo4j graph data for knowledge base visualization
    """
    try:
        logger.info("📊 Fetching Neo4j graph data...")
        
        # Connect to Neo4j
        neo4j_service.connect()
        
        # Get complete graph data
        graph_data = neo4j_service.get_complete_graph_data()
        
        logger.info(f"✅ Successfully fetched graph data: {len(graph_data['nodes'])} nodes, {len(graph_data['relationships'])} relationships")
        
        return JSONResponse(content=graph_data)
        
    except Exception as e:
        logger.error(f"❌ Error fetching knowledge graph: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch knowledge graph: {str(e)}")
    finally:
        # Close connection
        neo4j_service.close()

@app.post("/stateless_chat", response_model=ChatResponse)
async def stateless_chat_endpoint(request: ChatRequest):
    """
    Stateless chat endpoint that does not retain memory.
    """
    try:
        logger.info(f"🚀 Received stateless query: {request.query}")
        
        orchestrator = AgentOrchestrator()
        
        # Process the query without a session_id for stateless operation
        session_result = await orchestrator.process_query(request.query, session_id=None)
        
        reasoning_steps = [
            f"{step.step_type}: {step.content[:100]}..." if len(step.content) > 100 else f"{step.step_type}: {step.content}"
            for step in session_result.reasoning_steps
        ]
        
        return ChatResponse(
            response=session_result.final_response or "I was unable to process your request.",
            session_id="stateless", # Explicitly mark as stateless
            tools_used=session_result.tools_used,
            reasoning_steps=reasoning_steps
        )
        
    except Exception as e:
        logger.error(f"❌ Error processing stateless chat request: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

class ExpandNodeRequest(BaseModel):
    nodeId: str

@app.post("/api/expand-node")
async def expand_node(request: ExpandNodeRequest):
    """
    Expand a node to show its children
    """
    try:
        logger.info(f"🔍 Expanding node: {request.nodeId}")
        
        # Connect to Neo4j
        if not neo4j_service.driver:
            neo4j_service.connect()
        
        # Query for child nodes
        with neo4j_service.driver.session() as session:
            result = session.run("""
                MATCH p = (startNode)-[:HAS_CHILD]->(childNode)
                WHERE startNode.id = $nodeId
                RETURN p
            """, nodeId=request.nodeId)
            
            new_nodes = []
            new_edges = []
            seen_nodes = set()
            
            for record in result:
                path = record["p"]
                nodes = path.nodes
                relationships = path.relationships
                
                # Process nodes
                for node in nodes:
                    node_id = str(node.id)
                    if node_id not in seen_nodes:
                        seen_nodes.add(node_id)
                        labels = list(node.labels)
                        properties = dict(node)
                        
                        # Extract name from properties
                        name = properties.get("name") or properties.get("title") or labels[0] if labels else f"Node {node_id}"
                        
                        # Map label to category
                        category = neo4j_service._map_label_to_category(labels[0] if labels else None)
                        
                        new_nodes.append({
                            "id": node_id,
                            "name": name,
                            "labels": labels,
                            "properties": properties,
                            "category": category,
                            "description": properties.get("description") or properties.get("summary") or f"{labels[0] if labels else 'Node'} with ID {node_id}"
                        })
                
                # Process relationships
                for rel in relationships:
                    rel_id = str(rel.id)
                    rel_type = rel.type
                    rel_props = dict(rel)
                    
                    new_edges.append({
                        "id": rel_id,
                        "source": str(rel.start_node.id),
                        "target": str(rel.end_node.id),
                        "type": rel_type,
                        "properties": rel_props
                    })
            
            logger.info(f"✅ Expanded node {request.nodeId}: {len(new_nodes)} new nodes, {len(new_edges)} new edges")
            
            return {
                "new_nodes": new_nodes,
                "new_edges": new_edges
            }
            
    except Exception as e:
        logger.error(f"❌ Error expanding node: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to expand node: {str(e)}")
    finally:
        # Close connection
        neo4j_service.close()

@app.get("/api/schema-info")
async def get_schema_info():
    """
    Get schema information for the knowledge graph
    """
    try:
        logger.info("📊 Fetching schema information...")
        
        # Connect to Neo4j
        neo4j_service.connect()
        
        # Get schema information
        schema_info = neo4j_service.get_schema_info()
        
        logger.info(f"✅ Successfully fetched schema info: {len(schema_info['nodeTypes'])} node types, {len(schema_info['relationshipTypes'])} relationship types")
        
        return JSONResponse(content=schema_info)
        
    except Exception as e:
        logger.error(f"❌ Error fetching schema info: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch schema info: {str(e)}")
    finally:
        # Close connection
        neo4j_service.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 