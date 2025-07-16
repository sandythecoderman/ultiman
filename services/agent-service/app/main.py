from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import logging
import os
from typing import Optional, Dict
from app.core.orchestrator import AgentOrchestrator
from app.tools.knowledge_graph_querier import KnowledgeGraphQuerier
from app.tools.neo4j_service import neo4j_service
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
                    new_edges.append({
                        "id": str(rel.id),
                        "source": str(rel.start_node.id),
                        "target": str(rel.end_node.id),
                        "type": rel.type,
                        "properties": dict(rel)
                    })
        
        logger.info(f"✅ Found {len(new_nodes)} new nodes and {len(new_edges)} new edges")
        
        return JSONResponse(content={
            "nodes": new_nodes,
            "edges": new_edges
        })
        
    except Exception as e:
        logger.error(f"❌ Error expanding node {request.nodeId}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error expanding node: {str(e)}")

@app.get("/api/schema-info")
async def get_schema_info():
    """
    Get Neo4j schema information including labels and relationship types with counts
    """
    try:
        logger.info("🔍 Fetching Neo4j schema information")
        
        # Connect to Neo4j
        if not neo4j_service.driver:
            neo4j_service.connect()
        
        with neo4j_service.driver.session() as session:
            # Get node labels with counts
            label_result = session.run("""
                CALL db.labels() YIELD label
                CALL apoc.cypher.run(
                    'MATCH (n:' + label + ') RETURN count(n) as count', 
                    {}
                ) YIELD value
                RETURN label, value.count as count
            """)
            
            labels = []
            for record in label_result:
                labels.append({
                    "name": record["label"],
                    "count": record["count"]
                })
            
            # Get relationship types with counts  
            rel_type_result = session.run("""
                CALL db.relationshipTypes() YIELD relationshipType
                CALL apoc.cypher.run(
                    'MATCH ()-[r:' + relationshipType + ']->() RETURN count(r) as count',
                    {}
                ) YIELD value
                RETURN relationshipType, value.count as count
            """)
            
            relationship_types = []
            for record in rel_type_result:
                relationship_types.append({
                    "name": record["relationshipType"],
                    "count": record["count"]
                })
        
        logger.info(f"✅ Retrieved {len(labels)} labels and {len(relationship_types)} relationship types")
        
        return JSONResponse(content={
            "labels": labels,
            "relationshipTypes": relationship_types
        })
        
    except Exception as e:
        logger.error(f"❌ Error fetching schema info: {str(e)}")
        # Fallback to simple query without APOC if it's not available
        try:
            with neo4j_service.driver.session() as session:
                # Simple label query
                label_result = session.run("CALL db.labels() YIELD label RETURN label")
                labels = [{"name": record["label"], "count": 0} for record in label_result]
                
                # Simple relationship type query
                rel_result = session.run("CALL db.relationshipTypes() YIELD relationshipType RETURN relationshipType")
                relationship_types = [{"name": record["relationshipType"], "count": 0} for record in rel_result]
                
                return JSONResponse(content={
                    "labels": labels,
                    "relationshipTypes": relationship_types
                })
        except Exception as fallback_error:
            logger.error(f"❌ Fallback schema query failed: {str(fallback_error)}")
            raise HTTPException(status_code=500, detail=f"Error fetching schema info: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001) 