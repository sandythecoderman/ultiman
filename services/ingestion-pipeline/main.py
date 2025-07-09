import os
import re
import json
import numpy as np
import faiss
from neo4j import GraphDatabase
from sentence_transformers import SentenceTransformer
import pypdf

# --- Configuration (Temporary Hardcoded Credentials) ---
# TODO: Revert to using .env file once file system sync issue is resolved.
NEO4J_URI = "neo4j://localhost:7687"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "password"
NEO4J_DATABASE = "neo4j"

API_SPEC_PATH = "data/infraon-openAPI.json"
USER_GUIDE_PATH = "data/infraon-user-guide.pdf"
EMBEDDING_MODEL = 'all-MiniLM-L6-v2'

OUTPUT_DIR = "services/ingestion-pipeline/output"
API_INDEX_FILE = os.path.join(OUTPUT_DIR, "api_index.faiss")
DOCS_INDEX_FILE = os.path.join(OUTPUT_DIR, "docs_index.faiss")
API_CONTENT_FILE = os.path.join(OUTPUT_DIR, "api_content.json")
DOCS_CONTENT_FILE = os.path.join(OUTPUT_DIR, "docs_content.json")

# --- Mappings for Inference ---
MODULE_MAP = {
    'sd': 'ServiceDesk',
    'cmdb': 'AssetManagement',
    'platform': 'UserManagement',
    'config': 'Configuration',
    'discovery': 'Discovery',
    'nccm': 'NCCM',
    'monitoring': 'Monitoring',
    'common': 'Common'
}

class Neo4jHandler:
    """Handles connection and all data uploads to Neo4j."""
    def __init__(self, uri, user, password):
        self._driver = GraphDatabase.driver(uri, auth=(user, password))

    def close(self):
        self._driver.close()

    def _execute_query(self, query, parameters=None):
        with self._driver.session(database=NEO4J_DATABASE) as session:
            return list(session.run(query, parameters))

    def wipe_database(self):
        """Wipes all nodes and relationships from the database."""
        print("Wiping Neo4j database...")
        self._execute_query("MATCH (n) DETACH DELETE n")

    def setup_constraints(self):
        """Creates uniqueness constraints to ensure data integrity."""
        print("Setting up Neo4j constraints...")
        self._execute_query("CREATE CONSTRAINT IF NOT EXISTS FOR (m:Module) REQUIRE m.name IS UNIQUE")
        self._execute_query("CREATE CONSTRAINT IF NOT EXISTS FOR (e:Entity) REQUIRE e.name IS UNIQUE")
        self._execute_query("CREATE CONSTRAINT IF NOT EXISTS FOR (a:ApiEndpoint) REQUIRE (a.path, a.method) IS UNIQUE")

    def upload_data(self, module, entity, action, endpoint):
        query = """
        MERGE (m:Module {name: $module})
        MERGE (e:Entity {name: $entity})
        MERGE (a:ApiEndpoint {path: $path, method: $method})
        ON CREATE SET a.summary = $summary
        ON MATCH SET a.summary = $summary
        
        MERGE (m)-[:CONTAINS_ENTITY]->(e)
        MERGE (e)-[r:HAS_ACTION {type: $action}]->(a)
        """
        parameters = {
            "module": module,
            "entity": entity,
            "action": action,
            "path": endpoint['path'],
            "method": endpoint['method'],
            "summary": endpoint['summary']
        }
        self._execute_query(query, parameters)

def infer_from_path(path, method):
    """Infers Module, Entity, and Action from the API path and method."""
    parts = [part for part in path.split('/') if part]
    
    # Need at least 3 parts for module/entity inference (e.g., /ux/sd/task)
    if len(parts) < 3:
        return None, None, None

    # Infer Module
    module_key = parts[1]
    module = MODULE_MAP.get(module_key, "Unknown")

    # Infer Entity
    entity = parts[2].capitalize() # Simple capitalization, e.g., 'task' -> 'Task'

    # Infer Action
    action_map = {
        'GET': 'READ', 'POST': 'CREATE', 'PUT': 'UPDATE', 
        'PATCH': 'UPDATE', 'DELETE': 'DELETE'
    }
    action = action_map.get(method.upper(), 'ACTION')

    return module, entity, action

def process_openapi_json(neo4j_handler, model):
    """Processes the OpenAPI JSON, populates Neo4j, and generates embeddings."""
    print("Processing OpenAPI JSON...")
    embeddings, content = [], []
    with open(API_SPEC_PATH, 'r') as f:
        spec = json.load(f)

    for path, path_item in spec.get('paths', {}).items():
        for method, operation in path_item.items():
            module, entity, action = infer_from_path(path, method)
            if not all([module, entity, action]):
                continue # Skip if we can't infer the details

            summary = operation.get('summary', 'No summary available.')
            endpoint_data = {'path': path, 'method': method.upper(), 'summary': summary}
            neo4j_handler.upload_data(module, entity, action, endpoint_data)

            text = f"Module: {module}, Entity: {entity}, Action: {action}, API: {method.upper()} {path} - {summary}"
            embeddings.append(model.encode(text))
            content.append({'path': path, 'method': method.upper(), 'text': text})

    print(f"Processed {len(content)} API endpoints.")
    return embeddings, content

def process_pdf(model):
    """Processes the User Guide PDF and generates embeddings."""
    print("Processing User Guide PDF...")
    embeddings, content = [], []
    try:
        reader = pypdf.PdfReader(USER_GUIDE_PATH)
        full_text = "".join(page.extract_text() or "" for page in reader.pages)
        chunks = [chunk.strip() for chunk in full_text.split('\n\n') if chunk.strip()]
        
        print(f"Extracted {len(chunks)} text chunks from PDF.")
        for i, chunk in enumerate(chunks):
            embeddings.append(model.encode(chunk))
            content.append({'chunk_id': i, 'text': chunk})
    except Exception as e:
        print(f"Error processing PDF: {e}")

    print(f"Processed {len(content)} document chunks.")
    return embeddings, content

def save_faiss_index(index_file, content_file, embeddings, content):
    """Builds and saves a FAISS index and its corresponding content."""
    if not embeddings:
        print(f"No embeddings to save for {index_file}. Skipping.")
        return

    print(f"Saving FAISS index to {index_file}...")
    embeddings_np = np.array(embeddings).astype('float32')
    d = embeddings_np.shape[1]
    index = faiss.IndexFlatL2(d)
    index.add(embeddings_np)
    
    faiss.write_index(index, index_file)
    with open(content_file, 'w') as f:
        json.dump(content, f, indent=4)
    print(f"Successfully saved index to {index_file} and content to {content_file}")

def main():
    """Main function to run the ingestion pipeline."""
    print("Starting new, corrected ingestion pipeline...")
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    neo4j_handler = Neo4jHandler(NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD)
    neo4j_handler.wipe_database()
    neo4j_handler.setup_constraints()

    print(f"Loading embedding model: {EMBEDDING_MODEL}...")
    model = SentenceTransformer(EMBEDDING_MODEL)

    api_embeddings, api_content = process_openapi_json(neo4j_handler, model)
    doc_embeddings, doc_content = process_pdf(model)

    save_faiss_index(API_INDEX_FILE, API_CONTENT_FILE, api_embeddings, api_content)
    save_faiss_index(DOCS_INDEX_FILE, DOCS_CONTENT_FILE, doc_embeddings, doc_content)

    neo4j_handler.close()
    print("Ingestion pipeline finished successfully.")

if __name__ == "__main__":
    if not os.path.exists(API_SPEC_PATH) or not os.path.exists(USER_GUIDE_PATH):
        print(f"Error: Source files not found. Make sure '{API_SPEC_PATH}' and '{USER_GUIDE_PATH}' exist.")
    else:
        main() 