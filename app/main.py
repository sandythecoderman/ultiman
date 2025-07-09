import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any

from .engine import QueryEngine

# --- FastAPI App Initialization ---
app = FastAPI(
    title="Ultiman API",
    description="An agentic orchestration layer for the Infraon platform, powered by GraphRAG.",
    version="1.0.0"
)

# --- Pydantic Models for API Data Validation ---
class QueryRequest(BaseModel):
    query: str = Field(..., description="The natural language query to process.", example="how do I add a ticket for a user?")

class QueryResponse(BaseModel):
    user_query: str
    graph_context: str
    vector_db_results: List[str]
    comment: str

# --- Application Startup ---
# Create a single, reusable instance of the QueryEngine
# This is crucial for performance as it avoids reloading models and DB connections on every request.
query_engine: QueryEngine = None

@app.on_event("startup")
def startup_event():
    global query_engine
    print("Starting up and initializing Query Engine...")
    query_engine = QueryEngine()
    print("Application startup complete.")

# --- API Endpoints ---
@app.post("/query", response_model=QueryResponse)
def execute_query(request: QueryRequest):
    """
    Accepts a user query, processes it through the RAG pipeline,
    and returns the combined context for LLM synthesis.
    """
    if not query_engine:
        raise HTTPException(status_code=503, detail="Query Engine not initialized. Please wait.")
    
    try:
        result = query_engine.process_query(request.query)
        return result
    except Exception as e:
        # Log the exception for debugging
        print(f"An error occurred while processing the query: {e}")
        # Return a generic error response
        raise HTTPException(status_code=500, detail="An internal error occurred while processing the query.")


@app.get("/", summary="Health Check", description="A simple health check endpoint.")
def read_root():
    return {"status": "ok", "message": "Welcome to the Ultiman API"}

# --- Main entry point for running the app with uvicorn ---
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 