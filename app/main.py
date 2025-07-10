import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import time
import json

from .engine import GeminiRAG

# --- FastAPI App Initialization ---
app = FastAPI(
    title="Ultiman API",
    description="Powering the intelligent features of the Ultiman workflow management system.",
    version="0.2.0",
)

# --- CORS Middleware ---
# This allows the frontend (running on a different port) to communicate with this backend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],  # The origin of your frontend app
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
)


# --- API Models ---
class QueryRequest(BaseModel):
    query: str = Field(..., description="The natural language query to process.", example="how do I add a ticket for a user?")

class QueryResponse(BaseModel):
    answer: str

# --- Application Startup ---
# This is crucial for performance as it avoids reloading models and DB connections on every request.
rag_engine: GeminiRAG = None

@app.on_event("startup")
def startup_event():
    global rag_engine
    print("Starting up and initializing RAG Engine...")
    rag_engine = GeminiRAG()
    print("Application startup complete.")

# --- API Endpoints ---
@app.post("/query", response_model=QueryResponse)
def get_query_response(request: QueryRequest):
    """Receives a user query and returns the RAG pipeline's response."""
    if not rag_engine:
        raise HTTPException(status_code=503, detail="RAG Engine not initialized. Please wait.")
    
    try:
        answer = rag_engine.query(request.query)
        return {"answer": answer}
    except Exception as e:
        # Log the exception for debugging
        print(f"An error occurred while processing the query: {e}")
        # Return a generic error response
        raise HTTPException(status_code=500, detail="An internal error occurred while processing the query.")
        

class WorkflowGenerationRequest(BaseModel):
    prompt: str

@app.post("/workflow/generate")
def generate_workflow(request: WorkflowGenerationRequest):
    """
    Generates a workflow graph based on a user prompt using an LLM.
    """
    print(f"Generating workflow for prompt: '{request.prompt}'")
    
    workflow_json_str = rag_engine.generate_workflow_from_prompt(request.prompt)

    if not workflow_json_str:
        raise HTTPException(status_code=500, detail="Failed to generate workflow from LLM.")

    try:
        # The LLM returns a string, so we need to clean it up and parse it
        # It often includes markdown backticks, which we strip
        if workflow_json_str.strip().startswith("```json"):
            workflow_json_str = workflow_json_str.strip()[7:-4]
        
        workflow_data = json.loads(workflow_json_str)
        # Here, you could add validation to ensure the structure is correct
        return workflow_data
    except json.JSONDecodeError:
        print("Error: LLM returned invalid JSON for workflow generation.")
        print("Raw output:", workflow_json_str)
        raise HTTPException(status_code=500, detail="Failed to parse workflow from LLM response.")


class SuggestionRequest(BaseModel):
    node_label: str
    node_type: str

@app.post("/workflow/suggest")
def suggest_next_node(request: SuggestionRequest):
    """
    (Simulated) Suggests the next nodes based on the source node's data.
    """
    print(f"Getting suggestions for node: '{request.node_label}'")
    # In a real implementation, this would use an LLM with a more complex prompt.
    # For now, we'll use simple keyword matching to simulate suggestions.
    label_lower = request.node_label.lower()
    suggestions = []
    
    # General suggestions
    if "data" in label_lower or "api" in label_lower:
        suggestions.extend(["Process Data", "Filter Results", "Store in Database"])
    elif "process" in label_lower or "filter" in label_lower:
        suggestions.extend(["Analyze Sentiment", "Generate Report", "Notify Team"])
    elif "report" in label_lower or "analyze" in label_lower:
        suggestions.extend(["Send Email Summary", "Display on Dashboard"])
    else:
        suggestions.extend(["Notify Slack", "Create Ticket", "Log Event"])

    # Specific suggestion for error handling
    if any(keyword in label_lower for keyword in ["api", "crm", "database", "notify", "send"]):
        suggestions.append("Add Error Handler")


    return {"suggestions": suggestions}


class AnalysisRequest(BaseModel):
    nodes: List[Dict]
    edges: List[Dict]

@app.post("/workflow/analyze")
def analyze_workflow(request: AnalysisRequest):
    """
    (Simulated) Analyzes the workflow for potential optimizations.
    """
    print("Analyzing workflow...")
    # In a real implementation, we'd pass the nodes/edges to an LLM.
    # For simulation, we'll check for common patterns.
    
    analysis_results = []
    node_labels = {node['data']['label'].lower() for node in request.nodes}

    # Check 1: Missing error handling
    has_error_handler = any('error' in label for label in node_labels)
    if not has_error_handler and any(k in label for label in node_labels for k in ["api", "data", "notify"]):
        analysis_results.append({
            "id": "rec-1",
            "title": "Add Error Handling",
            "description": "Your workflow has API or data nodes but no error handling branch. Consider adding one to improve robustness."
        })
        
    # Check 2: Potential for parallelization
    if "filter" in node_labels and "enrich" in node_labels:
        analysis_results.append({
            "id": "rec-2",
            "title": "Parallelize Steps",
            "description": "The 'Filter' and 'Enrich' steps could potentially run in parallel to speed up the workflow."
        })

    # Check 3: Missing logging
    if not any("log" in label for label in node_labels):
        analysis_results.append({
            "id": "rec-3",
            "title": "Add Logging",
            "description": "Consider adding a logging step at the end of your workflow to record outcomes."
        })

    return {"analysis": analysis_results}


class CommandRequest(BaseModel):
    command: str
    nodes: List[Dict]
    edges: List[Dict]

@app.post("/workflow/command")
def handle_workflow_command(request: CommandRequest):
    """
    (Simulated) Parses a user's command from the sub-search bar to determine intent.
    This acts as a router to the correct backend logic.
    """
    command_lower = request.command.lower().strip()
    
    # Intent 1: Generation
    if command_lower.startswith("generate:") or command_lower.startswith("create:"):
        prompt = request.command.split(":", 1)[1].strip()
        print(f"Intent: Generate Workflow. Prompt: '{prompt}'")
        # In a real implementation, you would call the LLM for generation
        # For now, we reuse the existing mock generation logic
        from .mock_data import MOCK_WORKFLOW
        return {"action": "generate", "data": MOCK_WORKFLOW}

    # Intent 2: Analysis
    if command_lower == "analyze":
        print("Intent: Analyze Workflow")
        # Reuse the analysis logic, but packaged under a new action
        analysis_result = analyze_workflow(AnalysisRequest(nodes=request.nodes, edges=request.edges))
        return {"action": "analyze", "data": analysis_result}

    # Intent 3: Find/Query (Default)
    print(f"Intent: Find Nodes. Query: '{request.command}'")
    query_result = query_workflow(WorkflowQueryRequest(prompt=request.command, nodes=request.nodes))
    return {"action": "find", "data": query_result}


class FormGenerationRequest(BaseModel):
    node_label: str

@app.post("/nodes/generate-config-form")
def generate_node_config_form(request: FormGenerationRequest):
    """
    (Simulated) Generates a JSON schema for a node's configuration form.
    """
    print(f"Generating form for node: '{request.node_label}'")
    label_lower = request.node_label.lower()
    schema = []

    if "email" in label_lower:
        schema = [
            {"name": "recipient", "label": "Recipient Email", "type": "email"},
            {"name": "subject", "label": "Subject", "type": "text"},
            {"name": "body", "label": "Body", "type": "textarea"}
        ]
    elif "api" in label_lower:
        schema = [
            {"name": "url", "label": "API Endpoint URL", "type": "text"},
            {"name": "method", "label": "HTTP Method", "type": "select", "options": ["GET", "POST", "PUT"]},
            {"name": "headers", "label": "Headers (JSON)", "type": "textarea"}
        ]
    else:
        # Default fallback
        schema = [
            {"name": "details", "label": "Configuration Details", "type": "textarea"}
        ]
        
    return {"form_schema": schema}


class WorkflowQueryRequest(BaseModel):
    prompt: str
    nodes: List[Dict]

@app.post("/workflow/query")
def query_workflow(request: WorkflowQueryRequest):
    """
    (Simulated) Uses an LLM to find nodes in a workflow that match a natural language query.
    """
    print(f"Querying workflow with prompt: '{request.prompt}'")
    # In a real implementation, we would format a prompt for the LLM
    # asking it to return the IDs of nodes that match the query.
    # For this simulation, we'll return a fixed result based on a keyword.
    
    matching_ids = []
    if "notify" in request.prompt.lower() or "slack" in request.prompt.lower():
        # Find the "Notify Slack" node from the sample data
        for node in request.nodes:
            if "notify" in node.get("data", {}).get("label", "").lower():
                matching_ids.append(node["id"])

    return {"matching_node_ids": matching_ids}


@app.get("/", summary="Health Check", description="A simple health check endpoint.")
def read_root():
    return {"status": "ok", "message": "Welcome to the Ultiman API"}

# --- Main entry point for running the app with uvicorn ---
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 