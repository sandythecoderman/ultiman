from fastapi import FastAPI, Depends, Body, Request
from pydantic import BaseModel, Field
from typing import List
from contextlib import asynccontextmanager

from app.core.vector_store import VectorStore

# Use the lifespan manager to create a single VectorStore instance on startup
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Application startup: Initializing VectorStore...")
    app.state.vector_store = VectorStore()
    print("VectorStore initialized.")
    yield
    print("Application shutdown.")

app = FastAPI(
    title="Vector DB Service",
    description="A service for storing and searching text embeddings with FAISS.",
    version="0.1.0",
    lifespan=lifespan,
)

# --- Dependency ---
def get_vector_store(request: Request) -> VectorStore:
    return request.app.state.vector_store

# --- API Models ---
class IndexRequest(BaseModel):
    documents: List[str] = Field(..., min_items=1)

class SearchRequest(BaseModel):
    query: str
    k: int = 5

class SearchResult(BaseModel):
    content: str
    score: float

class SearchResponse(BaseModel):
    results: List[SearchResult]

# --- API Endpoints ---
@app.post("/index", status_code=201)
async def index_documents(
    request: IndexRequest = Body(...),
    store: VectorStore = Depends(get_vector_store)
):
    """Adds a list of documents to the vector store."""
    store.add_documents(request.documents)
    return {"message": f"Successfully indexed {len(request.documents)} documents."}

@app.post("/search", response_model=SearchResponse)
async def search_documents(
    request: SearchRequest = Body(...),
    store: VectorStore = Depends(get_vector_store)
):
    """Searches for documents similar to the query."""
    results = store.search(request.query, k=request.k)
    return SearchResponse(results=results)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Vector DB Service"} 