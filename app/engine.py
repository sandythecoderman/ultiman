import os
import json
import faiss
import numpy as np
from neo4j import GraphDatabase, exceptions
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Any
import google.generativeai as genai

# --- Configuration ---
TOP_K_RESULTS = 5 # Set a sensible, configurable default
# Get the absolute path to the project root directory, which is one level up from this file's directory
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
NEO4J_URI = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.environ.get("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.environ.get("NEO4J_PASSWORD", "password")
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
VECTOR_DB_PATH = os.path.join(PROJECT_ROOT, "services", "data-pipeline", "faiss_index") # Corrected path


class GeminiRAG:
    """
    A comprehensive query engine that combines knowledge graph traversal
    with semantic vector search to answer complex queries about the Infraon platform.
    """
    def __init__(self):
        print("Initializing RAG Engine...")
        self.driver = self._connect_to_neo4j()
        self.embedding_model = self._load_embedding_model()
        self.vector_db = self._load_vector_db()
        self.entity_cache = self._cache_entities()
        self.llm = self._initialize_llm()
        print("RAG Engine Initialized Successfully.")

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

    def _initialize_llm(self):
        """Initializes the Generative AI model using service account credentials."""
        try:
            # The library will automatically find and use GOOGLE_APPLICATION_CREDENTIALS
            # if it's set in the environment. Let's just initialize the model.
            model = genai.GenerativeModel('gemini-2.5-flash')
            print("Generative AI model initialized successfully using service account.")
            return model
        except Exception as e:
            print(f"Error initializing Generative AI model: {e}")
            print("Please ensure the GOOGLE_APPLICATION_CREDENTIALS environment variable is set correctly.")
            return None

    def _load_embedding_model(self):
        print(f"Loading embedding model: {EMBEDDING_MODEL}...")
        # Use trust_remote_code=True for this specific model
        model = SentenceTransformer(EMBEDDING_MODEL)
        print("Embedding model loaded.")
        return model

    def _load_vector_db(self):
        index_path = f"{VECTOR_DB_PATH}.bin"
        mapping_path = f"{VECTOR_DB_PATH.replace('_index', '_id_mapping')}.json"
        
        print(f"Loading vector database from {index_path}...")
        try:
            index = faiss.read_index(index_path)
            with open(mapping_path, "r", encoding='utf-8') as f:
                content_mapping = json.load(f)
            print(f"Vector DB loaded: {index.ntotal} vectors.")
            # The mapping file maps index positions to original content IDs
            return {"index": index, "mapping": content_mapping}
        except Exception as e:
            print(f"Failed to load vector database from {VECTOR_DB_PATH}: {e}")
            print("Please ensure the database files were generated correctly by the ingestion pipeline.")
            exit(1)

    def _cache_entities(self):
        print("Caching all named entities from the knowledge graph...")
        with self.driver.session() as session:
            result = session.run("MATCH (n) WHERE n.name IS NOT NULL RETURN DISTINCT toLower(n.name) AS name")
            # Cache all known entity names in lowercase for faster matching
            return {record["name"] for record in result}

    def _find_entities_in_query(self, query_text: str) -> List[str]:
        """Finds known graph entities mentioned in the user's query."""
        found_entities = set()
        # Use a simple text search, looking for cached entity names in the query
        # This is a basic approach. More advanced methods could use NLP libraries.
        query_lower = query_text.lower()
        for entity in self.entity_cache:
            if entity in query_lower:
                found_entities.add(entity)
        return list(found_entities) # Convert set to list for consistency with _get_graph_context

    def _get_graph_context(self, entities: list, limit: int = 10) -> str:
        """
        Traverses the knowledge graph from a starting set of entities to retrieve
        relevant context.
        """
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


    def _semantic_search(self, query_text: str, k: int = TOP_K_RESULTS) -> List[Dict[str, Any]]:
        """Performs semantic search on the vector database."""
        
        # --- DIRECT FIX ---
        # No matter what k was before, force it to a valid number if it's zero or less.
        if k <= 0:
            k = TOP_K_RESULTS # Set a sensible default like 5

        query_embedding = self.embedding_model.encode([query_text])
        
        # Faiss requires a 2D array of float32
        query_embedding_np = np.array(query_embedding).astype('float32')
        
        distances, indices = self.vector_db["index"].search(query_embedding_np, k)
        
        results = []
        for i in range(k):
            if i < len(indices[0]):
                idx = str(indices[0][i]) # mapping keys are strings
                # Use the mapping to find the original feature name
                original_info = self.vector_db["mapping"].get(idx, {})
                results.append(original_info)
        return results

    def _create_llm_prompt(self, user_query: str, vector_context: list, graph_context: str) -> str:
        """
        Formats the retrieved data into a comprehensive prompt for the LLM.
        """
        # Format the retrieved context into readable strings
        # Assuming the vector context items have a 'feature_name' and 'description'
        vector_text = "\\n".join([f"- {item.get('feature_name', '')}: {item.get('description', 'No description available.')}" for item in vector_context])

        prompt = f"""
        You are Ultiman, a helpful and highly skilled AI assistant for the Infraon product.
        Your task is to answer the user's question based *only* on the context provided below.

        **Instructions:**
        1.  Synthesize the information from the "Retrieved Text" and "Related Graph Data" to formulate your answer.
        2.  Provide a clear, concise, and helpful response.
        3.  If the context is empty or does not contain the answer, politely state that you do not have enough information about that specific topic. Do not make up information. However, if the user is making casual conversation (e.g., saying "hello"), respond naturally and friendly.
        4.  If the context mentions API endpoints, list them clearly.

        ---
        **CONTEXT 1: Retrieved Text from User Guide**
        {vector_text}
        ---
        **CONTEXT 2: Related Graph Data**
        {graph_context}
        ---

        **User's Question:**
        {user_query}

        **Your Answer:**
        """
        return prompt

    def _invoke_llm(self, prompt: str) -> str:
        """Invokes the LLM to get a response."""
        if not self.llm:
            # Fallback response system when Google API is not available
            return self._fallback_response(prompt)
        try:
            response = self.llm.generate_content(prompt)
            # Add a check for the response content
            if response and response.text:
                return response.text
            else:
                return "Received an empty response from the Language Model."
        except Exception as e:
            print(f"Error invoking LLM: {e}")
            # Fallback to basic response system
            return self._fallback_response(prompt)

    def _fallback_response(self, prompt: str) -> str:
        """Provides fallback responses when the LLM is not available."""
        # Extract the user query from the prompt
        if "User's Question:" in prompt:
            user_query = prompt.split("User's Question:")[-1].strip()
        else:
            user_query = prompt.lower()
        
        # Basic response patterns
        if any(word in user_query.lower() for word in ["hello", "hi", "hey", "howdy"]):
            return "Hello! I'm Ultiman, your AI assistant. I can help you with workflow creation, knowledge base queries, and more. What would you like to work on today?"
        
        elif any(word in user_query.lower() for word in ["workflow", "create", "build", "make", "generate", "design"]):
            # Check if this is a specific workflow creation request
            workflow_keywords = ["create", "build", "make", "generate", "design", "set up", "establish"]
            workflow_indicators = ["workflow", "pipeline", "process", "automation", "flow"]
            
            has_workflow_keyword = any(keyword in user_query.lower() for keyword in workflow_keywords)
            has_workflow_indicator = any(indicator in user_query.lower() for indicator in workflow_indicators)
            
            if has_workflow_keyword and has_workflow_indicator:
                # This is a specific workflow creation request, generate a workflow
                try:
                    workflow_json = self._fallback_workflow_generation(user_query)
                    if workflow_json:
                        return f"I've created a workflow based on your request: '{user_query}'. The workflow has been generated and should appear on your canvas. You can now customize and modify the nodes and connections as needed."
                    else:
                        return "I tried to create a workflow but encountered an issue. Please try again with a more specific description of what you want to automate."
                except Exception as e:
                    print(f"Error in fallback workflow generation: {e}")
                    return "I encountered an error while creating your workflow. Please try again with a different description."
            else:
                return "I can help you create workflows! Try describing what you want to automate or process. For example: 'Create a customer email workflow' or 'Build a data analysis pipeline'."
        
        elif any(word in user_query.lower() for word in ["help", "what can you do", "capabilities"]):
            return "I'm Ultiman, an AI assistant that can help you with:\n\n• Creating and managing workflows\n• Searching and exploring knowledge bases\n• Answering questions about processes and systems\n• Automating tasks and data processing\n\nWhat would you like to work on?"
        
        elif any(word in user_query.lower() for word in ["knowledge", "data", "information", "search"]):
            return "I can help you search through knowledge bases and find relevant information. You can explore the knowledge graph to see relationships between different entities and concepts."
        
        elif any(word in user_query.lower() for word in ["thank", "thanks"]):
            return "You're welcome! I'm here to help. Feel free to ask me anything about workflows, knowledge management, or automation."
        
        else:
            return "I understand you're asking about something, but I'm currently running in fallback mode without full AI capabilities. I can help you with:\n\n• Basic workflow creation\n• Knowledge base exploration\n• General guidance on automation\n\nTo enable full AI features, please configure the Google Generative AI credentials. For now, try asking about workflows or what I can help you with!"

    def query(self, query_text: str) -> str:
        """
        Processes a user query through the full RAG pipeline.
        1. Finds entities.
        2. Retrieves context from the knowledge graph.
        3. Performs semantic search.
        4. Invokes an LLM to generate a response.
        """
        # --- DIRECT FIX for conversational greetings ---
        greetings = ["hi", "hello", "hey", "yo", "sup", "howdy"]
        if query_text.lower().strip().rstrip("!.") in greetings:
            return "Hello! How can I help you today?"

        # --- WORKFLOW CREATION DETECTION ---
        workflow_keywords = ["create", "build", "make", "generate", "design", "set up", "establish"]
        workflow_indicators = ["workflow", "pipeline", "process", "automation", "flow"]
        
        query_lower = query_text.lower()
        has_workflow_keyword = any(keyword in query_lower for keyword in workflow_keywords)
        has_workflow_indicator = any(indicator in query_lower for indicator in workflow_indicators)
        
        if has_workflow_keyword and has_workflow_indicator:
            # This is a workflow creation request
            print(f"\\n--- Detected Workflow Creation Request: '{query_text}' ---")
            try:
                workflow_json = self.generate_workflow_from_prompt(query_text)
                if workflow_json:
                    return f"I've created a workflow based on your request: '{query_text}'. The workflow has been generated and should appear on your canvas. You can now customize and modify the nodes and connections as needed."
                else:
                    return "I tried to create a workflow but encountered an issue. Please try again with a more specific description of what you want to automate."
            except Exception as e:
                print(f"Error in workflow generation: {e}")
                return "I encountered an error while creating your workflow. Please try again with a different description."

        print(f"\\n--- Processing Query: '{query_text}' ---")

        # 1. Entity Extraction
        entities = self._find_entities_in_query(query_text)
        print(f"Step 1: Found entities in query: {entities or 'None'}")

        # 2. Graph Context Retrieval
        graph_context = self._get_graph_context(entities)
        print("Step 2: Retrieved Graph Context...")
        
        # 3. Vector DB Search
        print(f"Step 3: Searching Vector DB...")
        search_results = self._semantic_search(query_text)
        print(f"Step 3a: Top Semantic Search Results: {[res.get('feature_name', 'N/A') for res in search_results]}")

        # 4. LLM Prompt Generation and Invocation
        print("Step 4: Generating prompt and invoking LLM...")
        prompt = self._create_llm_prompt(query_text, search_results, graph_context)
        final_answer = self._invoke_llm(prompt)
        
        print("Step 5: Final answer generated.")
        return final_answer 

    def generate_workflow_from_prompt(self, query: str):
        # This is a basic prompt. A more advanced implementation would include
        # more examples, constraints, and details about the available node types.
        prompt = f"""
You are a workflow generation assistant. Based on the user's request, create a directed graph of nodes and edges.

Return the response as a single JSON object with two keys: "nodes" and "edges".

- "nodes": A list of node objects. Each node must have:
  - "id": A unique string identifier (e.g., "node-1", "node-2").
  - "position": An object with "x" and "y" coordinates. Arrange the nodes in a logical flow from left to right.
  - "data": An object with a "label" for the node's name.
  - "type": Can be "input", "output", or "default". The first node should be "input", the last "output".

- "edges": A list of edge objects. Each edge must have:
  - "id": A unique string identifier (e.g., "edge-1").
  - "source": The "id" of the source node.
  - "target": The "id" of the target node.
  - "animated": Set this to true.

User Request: "{query}"

Produce the JSON output now.
"""
        try:
            # We expect the model to return a JSON string, which we then parse.
            if self.llm:
                response = self.llm.generate_content(prompt)
                return response.text
            else:
                # Fallback workflow generation
                return self._fallback_workflow_generation(query)
        except Exception as e:
            print(f"Error generating workflow with Gemini: {e}")
            # Fallback workflow generation
            return self._fallback_workflow_generation(query)

    def _fallback_workflow_generation(self, query: str) -> str:
        """Provides fallback workflow generation when the LLM is not available."""
        query_lower = query.lower()
        
        # Enhanced workflow templates based on keywords
        if any(word in query_lower for word in ["email", "mail", "message", "customer email"]):
            return json.dumps({
                "nodes": [
                    {"id": "node-1", "position": {"x": 100, "y": 100}, "data": {"label": "Receive Email"}, "type": "input"},
                    {"id": "node-2", "position": {"x": 300, "y": 100}, "data": {"label": "Classify Email"}, "type": "default"},
                    {"id": "node-3", "position": {"x": 500, "y": 100}, "data": {"label": "Process Content"}, "type": "default"},
                    {"id": "node-4", "position": {"x": 700, "y": 100}, "data": {"label": "Generate Response"}, "type": "default"},
                    {"id": "node-5", "position": {"x": 900, "y": 100}, "data": {"label": "Send Reply"}, "type": "output"}
                ],
                "edges": [
                    {"id": "edge-1", "source": "node-1", "target": "node-2", "animated": True},
                    {"id": "edge-2", "source": "node-2", "target": "node-3", "animated": True},
                    {"id": "edge-3", "source": "node-3", "target": "node-4", "animated": True},
                    {"id": "edge-4", "source": "node-4", "target": "node-5", "animated": True}
                ]
            })
        
        elif any(word in query_lower for word in ["data", "analysis", "process", "pipeline"]):
            return json.dumps({
                "nodes": [
                    {"id": "node-1", "position": {"x": 100, "y": 100}, "data": {"label": "Input Data"}, "type": "input"},
                    {"id": "node-2", "position": {"x": 300, "y": 100}, "data": {"label": "Validate Data"}, "type": "default"},
                    {"id": "node-3", "position": {"x": 500, "y": 100}, "data": {"label": "Clean Data"}, "type": "default"},
                    {"id": "node-4", "position": {"x": 700, "y": 100}, "data": {"label": "Analyze Data"}, "type": "default"},
                    {"id": "node-5", "position": {"x": 900, "y": 100}, "data": {"label": "Generate Report"}, "type": "output"}
                ],
                "edges": [
                    {"id": "edge-1", "source": "node-1", "target": "node-2", "animated": True},
                    {"id": "edge-2", "source": "node-2", "target": "node-3", "animated": True},
                    {"id": "edge-3", "source": "node-3", "target": "node-4", "animated": True},
                    {"id": "edge-4", "source": "node-4", "target": "node-5", "animated": True}
                ]
            })
        
        elif any(word in query_lower for word in ["support", "ticket", "issue", "help"]):
            return json.dumps({
                "nodes": [
                    {"id": "node-1", "position": {"x": 100, "y": 100}, "data": {"label": "Receive Ticket"}, "type": "input"},
                    {"id": "node-2", "position": {"x": 300, "y": 100}, "data": {"label": "Categorize Issue"}, "type": "default"},
                    {"id": "node-3", "position": {"x": 500, "y": 100}, "data": {"label": "Assign Priority"}, "type": "default"},
                    {"id": "node-4", "position": {"x": 700, "y": 100}, "data": {"label": "Process Resolution"}, "type": "default"},
                    {"id": "node-5", "position": {"x": 900, "y": 100}, "data": {"label": "Close Ticket"}, "type": "output"}
                ],
                "edges": [
                    {"id": "edge-1", "source": "node-1", "target": "node-2", "animated": True},
                    {"id": "edge-2", "source": "node-2", "target": "node-3", "animated": True},
                    {"id": "edge-3", "source": "node-3", "target": "node-4", "animated": True},
                    {"id": "edge-4", "source": "node-4", "target": "node-5", "animated": True}
                ]
            })
        
        elif any(word in query_lower for word in ["content", "create", "generate", "automation"]):
            return json.dumps({
                "nodes": [
                    {"id": "node-1", "position": {"x": 100, "y": 100}, "data": {"label": "Input Request"}, "type": "input"},
                    {"id": "node-2", "position": {"x": 300, "y": 100}, "data": {"label": "Research Topic"}, "type": "default"},
                    {"id": "node-3", "position": {"x": 500, "y": 100}, "data": {"label": "Generate Content"}, "type": "default"},
                    {"id": "node-4", "position": {"x": 700, "y": 100}, "data": {"label": "Review & Edit"}, "type": "default"},
                    {"id": "node-5", "position": {"x": 900, "y": 100}, "data": {"label": "Publish Content"}, "type": "output"}
                ],
                "edges": [
                    {"id": "edge-1", "source": "node-1", "target": "node-2", "animated": True},
                    {"id": "edge-2", "source": "node-2", "target": "node-3", "animated": True},
                    {"id": "edge-3", "source": "node-3", "target": "node-4", "animated": True},
                    {"id": "edge-4", "source": "node-4", "target": "node-5", "animated": True}
                ]
            })
        
        else:
            # Generic workflow with more detailed steps
            return json.dumps({
                "nodes": [
                    {"id": "node-1", "position": {"x": 100, "y": 100}, "data": {"label": "Start Process"}, "type": "input"},
                    {"id": "node-2", "position": {"x": 300, "y": 100}, "data": {"label": "Validate Input"}, "type": "default"},
                    {"id": "node-3", "position": {"x": 500, "y": 100}, "data": {"label": "Process Data"}, "type": "default"},
                    {"id": "node-4", "position": {"x": 700, "y": 100}, "data": {"label": "Generate Output"}, "type": "default"},
                    {"id": "node-5", "position": {"x": 900, "y": 100}, "data": {"label": "Complete Task"}, "type": "output"}
                ],
                "edges": [
                    {"id": "edge-1", "source": "node-1", "target": "node-2", "animated": True},
                    {"id": "edge-2", "source": "node-2", "target": "node-3", "animated": True},
                    {"id": "edge-3", "source": "node-3", "target": "node-4", "animated": True},
                    {"id": "edge-4", "source": "node-4", "target": "node-5", "animated": True}
                ]
            }) 