from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import logging
import os
from typing import Optional, Dict
from app.core.orchestrator import AgentOrchestrator
from app.tools.knowledge_graph_querier import KnowledgeGraphQuerier
from fastapi.responses import JSONResponse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Ultiman Agent Service",
    description="Simplified agentic pipeline for Infraon Infinity Platform",
    version="1.0.0"
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

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "agent-service"}

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


@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Main chat endpoint that orchestrates the agentic pipeline
    """
    try:
        logger.info(f"🚀 Received query: {request.query}")
        
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
    Fetches the entire knowledge graph from Neo4j and formats it for React Flow.
    """
    try:
        logger.info("🧠 Fetching knowledge graph")
        kg_querier = KnowledgeGraphQuerier()
        
        # A query to get all nodes and their relationships
        query = "MATCH (n) OPTIONAL MATCH (n)-[r]->(m) RETURN n, r, m"
        
        results = await kg_querier._execute_query(query, {})
        
        nodes = []
        edges = []
        node_ids = set()

        for record in results:
            if 'n' in record and record['n'] and record['n']['properties']['id'] not in node_ids:
                node = record['n']
                node_data = {
                    'id': node['properties']['id'],
                    'position': { 'x': 0, 'y': 0 },
                    'data': { 
                        'label': node['properties'].get('name', node['properties']['id']),
                        'type': list(node['labels'])[0] if node['labels'] else 'Unknown',
                        'description': node['properties'].get('description', '')
                    },
                }
                nodes.append(node_data)
                node_ids.add(node['properties']['id'])

            if 'm' in record and record['m'] and record['m']['properties']['id'] not in node_ids:
                node = record['m']
                node_data = {
                    'id': node['properties']['id'],
                    'position': { 'x': 0, 'y': 0 },
                    'data': { 
                        'label': node['properties'].get('name', node['properties']['id']),
                        'type': list(node['labels'])[0] if node['labels'] else 'Unknown',
                        'description': node['properties'].get('description', '')
                    },
                }
                nodes.append(node_data)
                node_ids.add(node['properties']['id'])
            
            if 'r' in record and record['r']:
                rel = record['r']
                # Ensure source and target are in the record
                if 'n' in record and 'm' in record and record['n'] and record['m']:
                    source_id = record['n']['properties']['id']
                    target_id = record['m']['properties']['id']
                    edges.append({
                        'id': f"{source_id}-{rel['type']}-{target_id}",
                        'source': source_id,
                        'target': target_id,
                        'label': rel['type'],
                        'type': 'step'
                    })

        # Simple layouting logic
        for i, node in enumerate(nodes):
            node['position'] = {'x': (i % 10) * 150, 'y': (i // 10) * 100}

        logger.info(f"✅ Found {len(nodes)} nodes and {len(edges)} edges.")
        
        return {"nodes": nodes, "edges": edges}

    except Exception as e:
        logger.error(f"❌ Error fetching knowledge graph: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001) 