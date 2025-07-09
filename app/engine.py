import os
import json
import faiss
import numpy as np
from neo4j import GraphDatabase, exceptions
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Any

# --- Configuration ---
# Get the absolute path to the project root directory, which is one level up from this file's directory
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
NEO4J_URI = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.environ.get("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.environ.get("NEO4J_PASSWORD", "password")
EMBEDDING_MODEL = "BAAI/bge-large-en-v1.5"
API_DB_PATH = os.path.join(PROJECT_ROOT, "data", "api_index")
DOCS_DB_PATH = os.path.join(PROJECT_ROOT, "data", "docs_index")

class QueryEngine:
    """
    A comprehensive query engine that combines knowledge graph traversal
    with semantic vector search to answer complex queries about the Infraon platform.
    """
    def __init__(self):
        print("Initializing Query Engine...")
        self.driver = self._connect_to_neo4j()
        self.embedding_model = self._load_embedding_model()
        self.api_db = self._load_vector_db("api")
        self.docs_db = self._load_vector_db("docs")
        self.entity_cache = self._cache_entities()
        print("Query Engine Initialized Successfully.")

    def _connect_to_neo4j(self):
        try:
            driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
            driver.verify_connectivity()
            print("Neo4j connection successful.")
            return driver
        except exceptions.ServiceUnavailable as e:
            print(f"Error connecting to Neo4j: {e}")
            print("Please ensure the Neo4j container is running and accessible.")
            exit(1)
        except exceptions.AuthError as e:
            print(f"Neo4j authentication failed: {e}")
            print("Please check your NEO4J_USER and NEO4J_PASSWORD environment variables.")
            exit(1)

    def _load_embedding_model(self):
        print(f"Loading embedding model: {EMBEDDING_MODEL}...")
        # Use trust_remote_code=True for this specific model
        model = SentenceTransformer(EMBEDDING_MODEL, trust_remote_code=True)
        print("Embedding model loaded.")
        return model

    def _load_vector_db(self, db_name: str):
        path_prefix = API_DB_PATH if db_name == "api" else DOCS_DB_PATH
        index_path = f"{path_prefix}.faiss"
        content_path = f"{path_prefix.replace('_index', '_content')}.json"
        
        print(f"Loading {db_name} vector database from {index_path}...")
        try:
            index = faiss.read_index(index_path)
            with open(content_path, "r", encoding='utf-8') as f:
                content = json.load(f)
            print(f"{db_name.capitalize()} DB loaded: {index.ntotal} vectors.")
            return {"index": index, "content": content}
        except Exception as e:
            print(f"Failed to load vector database '{db_name}' from {path_prefix}: {e}")
            print("Please ensure the database files were generated correctly by the ingestion pipeline.")
            exit(1)

    def _cache_entities(self):
        print("Caching all named entities from the knowledge graph...")
        with self.driver.session() as session:
            result = session.run("MATCH (n) WHERE n.name IS NOT NULL RETURN DISTINCT toLower(n.name) AS name")
            # Cache all known entity names in lowercase for faster matching
            return {record["name"] for record in result}

    def _find_entities_in_query(self, query_text: str) -> set:
        """Finds known graph entities mentioned in the user's query."""
        found_entities = set()
        # Use a simple text search, looking for cached entity names in the query
        # This is a basic approach. More advanced methods could use NLP libraries.
        query_lower = query_text.lower()
        for entity in self.entity_cache:
            if entity in query_lower:
                found_entities.add(entity)
        return found_entities

    def _get_graph_context(self, entities: set, limit: int = 10) -> str:
        """Retrieves a subgraph of context for a set of entities."""
        if not entities:
            return "No relevant entities found in the knowledge graph."

        query = """
        UNWIND $entities AS entityName
        MATCH path = (n)-[r]-(m)
        WHERE toLower(n.name) = entityName
        RETURN n.name AS entity, type(r) as relationship, m.name as neighbor, labels(m) as neighborLabels
        LIMIT $limit
        """
        context_parts = []
        with self.driver.session() as session:
            results = session.run(query, entities=list(entities), limit=limit)
            for record in results:
                neighbor_label = f" (a {record['neighborLabels'][0]})" if record['neighborLabels'] else ""
                context_parts.append(
                    f"The '{record['entity']}' is connected to '{record['neighbor']}'{neighbor_label} "
                    f"via the relationship '{record['relationship']}'."
                )
        return "\\n".join(context_parts) if context_parts else "No direct relationships found for the given entities."


    def _semantic_search(self, query_text: str, db_name: str, k: int = 3) -> List[Dict[str, Any]]:
        """Performs semantic search on the specified vector database."""
        db = self.api_db if db_name == "api" else self.docs_db
        query_embedding = self.embedding_model.encode([query_text])
        
        # Faiss requires a 2D array of float32
        query_embedding_np = np.array(query_embedding).astype('float32')
        
        distances, indices = db["index"].search(query_embedding_np, k)
        
        results = []
        for i in range(k):
            if i < len(indices[0]):
                idx = indices[0][i]
                # Ensure the content is a dictionary, not just a string
                if isinstance(db["content"][idx], dict):
                    results.append(db["content"][idx])
                else: # Handle the case where content might just be text
                    results.append({"text": db["content"][idx]})
        return results

    def _decide_search_strategy(self, query_text: str) -> str:
        """Determines whether to search the API or Docs DB based on query intent."""
        action_verbs = ["create", "add", "update", "delete", "get", "find", "assign", "remove", "set", "how do i"]
        if any(verb in query_text.lower() for verb in action_verbs):
            return "api"
        return "docs"

    def process_query(self, query_text: str) -> Dict[str, Any]:
        """
        Processes a user query through the full RAG pipeline.
        1. Finds entities in the query.
        2. Retrieves context from the knowledge graph.
        3. Decides which vector DB to search.
        4. Performs semantic search.
        5. Assembles the final context for an LLM.
        """
        print(f"\\n--- Processing Query: '{query_text}' ---")

        # 1. Entity Extraction
        entities = self._find_entities_in_query(query_text)
        print(f"Step 1: Found entities in query: {entities or 'None'}")

        # 2. Graph Context Retrieval
        graph_context = self._get_graph_context(entities)
        print("Step 2: Retrieved Graph Context:")
        print("---")
        print(graph_context)
        print("---")
        
        # 3. Vector DB Search
        search_target = self._decide_search_strategy(query_text)
        print(f"Step 3: Query seems {'action-oriented' if search_target == 'api' else 'informational'}. Searching {search_target.capitalize()} Vector DB...")
        
        search_results = self._semantic_search(query_text, search_target)
        print("Step 3a: Top Semantic Search Results:")
        print("---")
        for i, res in enumerate(search_results):
            print(f"{i+1}. {res.get('text', 'N/A')}")
        print("---")

        # 4. Assemble Final Context
        final_context = {
            "user_query": query_text,
            "graph_context": graph_context,
            "vector_db_results": [res.get('text', 'N/A') for res in search_results],
            "comment": "In a full application, this context would be passed to a generative LLM to synthesize a final answer."
        }
        
        print("\nStep 4: Final combined context is ready.")
        
        return final_context 