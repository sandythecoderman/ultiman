import json
import os
import numpy as np
import faiss
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from neo4j import GraphDatabase
from sentence_transformers import SentenceTransformer

# --- Configuration ---
# Neo4j connection details (replace with your actual credentials)
NEO4J_URI = "neo4j://localhost:7687"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "password"

# --- File paths ---
# Get the absolute path to the directory where this script is located
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CORPUS_FILE = os.path.join(SCRIPT_DIR, "EnrichedKnowledgeCorpus.json")
FAISS_INDEX_FILE = os.path.join(SCRIPT_DIR, "faiss_index.bin")
FAISS_MAPPING_FILE = os.path.join(SCRIPT_DIR, "faiss_id_mapping.json")


# --- Pydantic Model to Validate the Input File ---
class CorpusItem(BaseModel):
    api_endpoint: str
    http_method: str
    long_description_from_guide: str
    # Making these optional as they might not exist in all entries
    keywords: Optional[Dict[str, List[str]]] = {}
    query_parameters: Optional[List[Dict]] = []
    request_body: Optional[Dict] = None
    response_body: Optional[Dict] = None


# --- Neo4j Loading Function ---
def load_to_neo4j(driver: GraphDatabase.driver, corpus_data: List[dict]):
    print("--- Connecting to Neo4j and clearing old data... ---")
    with driver.session() as session:
        session.run("MATCH (n) DETACH DELETE n")

    print(f"--- Populating Neo4j with {len(corpus_data)} features... ---")
    with driver.session() as session:
        for item in corpus_data:
            # Create Feature node from the API endpoint
            session.run("""
                MERGE (f:Feature {name: $feature_name})
                SET f.summary = $summary, f.http_method = $http_method
            """, feature_name=item['api_endpoint'], summary=item['long_description_from_guide'], http_method=item['http_method'])

            # The JSON doesn't seem to have separate API nodes to link to,
            # the feature IS the API endpoint in this structure.
            # So, we won't create API_Endpoint nodes separately.

    print("--- Neo4j population complete. ---")

# --- Faiss Loading Function ---
def load_to_faiss(corpus_data: List[dict]):
    print("--- Initializing sentence transformer model for Faiss... ---")
    # Using a popular, high-performance model
    model = SentenceTransformer('all-MiniLM-L6-v2')
    
    print("--- Generating text embeddings... ---")
    texts_to_embed = []
    id_mapping = {}
    
    for idx, item in enumerate(corpus_data):
        # We will index the long description for retrieval
        doc_id = f"doc_{idx}"
        texts_to_embed.append(item['long_description_from_guide'])
        id_mapping[len(texts_to_embed) - 1] = {"id": doc_id, "feature_name": item['api_endpoint']}

    embeddings = model.encode(texts_to_embed, show_progress_bar=True)
    embeddings = np.array(embeddings).astype('float32')
    
    # Create and populate Faiss index
    print("--- Building and saving Faiss index... ---")
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index = faiss.IndexIDMap(index)
    
    ids = np.array(list(id_mapping.keys()))
    index.add_with_ids(embeddings, ids)
    
    # Save the index and mapping file
    faiss.write_index(index, FAISS_INDEX_FILE)
    with open(FAISS_MAPPING_FILE, 'w') as f:
        json.dump(id_mapping, f)
        
    print(f"--- Faiss index built with {index.ntotal} vectors and saved. ---")


# --- Main Execution Block ---
def main():
    print(f"--- Starting data loading from '{CORPUS_FILE}' ---")
    
    # 1. Load and validate the source file
    try:
        with open(CORPUS_FILE, 'r') as f:
            data = json.load(f)
        
        # Validate each item in the corpus using Pydantic
        validated_data = [CorpusItem(**item).model_dump() for item in data]
        print(f"Successfully loaded and validated {len(validated_data)} items.")

    except FileNotFoundError:
        print(f"FATAL ERROR: The file '{CORPUS_FILE}' was not found. Please make sure it is in the correct directory.")
        return
    except Exception as e:
        print(f"FATAL ERROR: Failed to parse or validate the corpus file. Error: {e}")
        return

    # 2. Load data into Neo4j
    try:
        driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
        load_to_neo4j(driver, validated_data)
        driver.close()
    except Exception as e:
        print(f"FATAL ERROR: Could not connect to or populate Neo4j. Error: {e}")
        return

    # 3. Load data into Faiss
    try:
        load_to_faiss(validated_data)
    except Exception as e:
        print(f"FATAL ERROR: Failed to create Faiss index. Error: {e}")
        return
        
    print("\n\n✅ Data loading complete. You can now proceed with testing your agent pipeline.")

if __name__ == "__main__":
    main() 