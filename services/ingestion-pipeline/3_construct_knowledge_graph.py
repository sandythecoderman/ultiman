import os
import json
import time
import random
from typing import Dict, List, Any

import vertexai
from vertexai.generative_models import GenerativeModel
from google.oauth2 import service_account
from google.auth.exceptions import DefaultCredentialsError
from google.api_core import exceptions

# --- Configuration ---
MODEL_NAME = "gemini-2.5-flash"
PROJECT_ID = "ultiman"
LOCATION = "us-central1"
DATA_DIR = "data"
ENRICHED_USER_GUIDE_PATH = os.path.join(DATA_DIR, "enriched_user_guide.json")
RAW_API_SPEC_PATH = os.path.join(DATA_DIR, "raw_api_spec.json")
KNOWLEDGE_GRAPH_PATH = os.path.join(DATA_DIR, "knowledge_graph.json")
CREDENTIALS_PATH = "Ultiman-cred.json"

# --- Function Definitions ---

def get_vertex_credentials() -> service_account.Credentials:
    """Loads Google Cloud credentials from the specified service account JSON file."""
    if not os.path.exists(CREDENTIALS_PATH):
        raise FileNotFoundError(
            f"Service account file not found at {CREDENTIALS_PATH}. "
            f"Please ensure '{os.path.basename(CREDENTIALS_PATH)}' is in the project root."
        )
    try:
        return service_account.Credentials.from_service_account_file(CREDENTIALS_PATH)
    except Exception as e:
        raise RuntimeError(f"Error loading credentials from {CREDENTIALS_PATH}: {e}")

def load_json_data(file_path: str) -> List[Dict[str, Any]]:
    """Loads JSON data from a file."""
    print(f"Loading enriched data from: {file_path}")
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def load_api_spec(file_path: str) -> List[Dict[str, Any]]:
    """Loads the raw API specification from a file."""
    print(f"Loading API specification from: {file_path}")
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def generate_context_summary(api_spec: List[Dict[str, Any]], enriched_data: List[Dict[str, Any]]) -> str:
    """Generates a high-level summary of the API spec and user guide."""
    print("Generating high-level context summary...")
    
    # Summarize API Spec by counting the number of endpoints
    api_summary = f"The API specification contains {len(api_spec)} endpoints."

    # Summarize User Guide
    doc_summary = f"The user documentation contains {len(enriched_data)} sections, covering various topics."
    
    # Combine summaries
    full_summary = (
        "Here is a high-level summary of the project documentation:\n"
        f"1.  **API Specification**: {api_summary}\n"
        f"2.  **User Guide**: {doc_summary}\n"
        "This context should be used to understand the relationships between different concepts."
    )
    print("Context summary generated.")
    return full_summary

def build_knowledge_graph_prompt(context_summary: str, enriched_chunk: Dict[str, Any]) -> str:
    """Creates a detailed prompt for the LLM to extract graph nodes and edges."""
    
    # Use the enriched content which is more structured
    chunk_content = enriched_chunk.get('enriched_content', '')
    if not chunk_content:
        # Fallback to original text if enriched content is missing
        chunk_content = enriched_chunk.get('text', '')

    prompt = f"""
    **Objective:** Act as a Knowledge Graph expert. Your task is to extract entities (nodes) and their relationships (edges) from the provided text chunk. Use the high-level context to inform the connections.

    **High-Level Context:**
    {context_summary}

    **Text Chunk to Analyze:**
    ---
    {json.dumps(chunk_content, indent=2)}
    ---

    **Instructions:**
    1.  **Identify Entities (Nodes):** Extract key entities. Assign a unique `id` (preferably the name of the entity) and a `type`.
        *   **Entity Types:** `API_Endpoint`, `UI_Component`, `Concept`, `Feature`, `Data_Object`, `User_Role`, `System_Action`.
    2.  **Identify Relationships (Edges):** Define the connections between the entities you identified. A relationship must have a `source` (ID of the source node), a `target` (ID of the target node), and a `relationship` label describing the connection (e.g., `CALLS`, `CONTAINS`, `MANAGES`, `IMPLEMENTS`, `TRIGGERS`, `RELATES_TO`).
    3.  **Output Format:** Provide the output *only* in a single, valid JSON object format, with two keys: "nodes" and "edges". Do not include any other text or explanations.

    **JSON Output Example:**
    {{
      "nodes": [
        {{
          "id": "User Authentication",
          "type": "Concept",
          "description": "The process of verifying a user's identity to grant access."
        }},
        {{
          "id": "/auth/login",
          "type": "API_Endpoint",
          "description": "API endpoint for user login."
        }}
      ],
      "edges": [
        {{
          "source": "/auth/login",
          "target": "User Authentication",
          "relationship": "IMPLEMENTS"
        }}
      ]
    }}
    """
    return prompt

def extract_graph_from_chunk(model: GenerativeModel, prompt: str) -> Dict[str, List[Dict[str, Any]]]:
    """
    Sends a prompt to the model and extracts the JSON response,
    with exponential backoff for rate limiting errors.
    """
    max_retries = 5
    base_delay = 2  # seconds

    for attempt in range(max_retries):
        try:
            print("Sending request to generative model...")
            response = model.generate_content(prompt)
            
            # Clean the response to extract only the JSON part
            response_text = response.text.strip()
            
            # More robust JSON extraction
            if '```json' in response_text:
                json_str = response_text.split('```json')[1].split('```')[0].strip()
            else:
                json_start = response_text.find('{')
                json_end = response_text.rfind('}') + 1
                if json_start != -1 and json_end != 0:
                    json_str = response_text[json_start:json_end]
                else:
                    print("Warning: Could not find a valid JSON object in the response.")
                    return {"nodes": [], "edges": []}

            return json.loads(json_str)

        except exceptions.ResourceExhausted as e:
            if attempt < max_retries - 1:
                delay = base_delay * (2 ** attempt) + random.uniform(0, 1)
                print(f"Warning: Resource exhausted (429). Retrying in {delay:.2f} seconds... (Attempt {attempt + 1}/{max_retries})")
                time.sleep(delay)
            else:
                print(f"Error: Max retries reached for resource exhaustion. Aborting this chunk. Error: {e}")
                return {"nodes": [], "edges": []}
        except Exception as e:
            print(f"An unhandled error occurred during model generation or JSON parsing: {e}")
            return {"nodes": [], "edges": []}
            
    return {"nodes": [], "edges": []}

def merge_graphs(
    all_nodes: Dict[str, Dict[str, Any]], 
    all_edges: List[Dict[str, Any]], 
    new_graph: Dict[str, List[Dict[str, Any]]]
):
    """Merges new nodes and edges into the main graph, avoiding duplicates."""
    for node in new_graph.get("nodes", []):
        if node.get("id") and node["id"] not in all_nodes:
            all_nodes[node["id"]] = node

    for edge in new_graph.get("edges", []):
        all_edges.append(edge)

# --- Main Execution ---

def main():
    """Main function to construct and save the knowledge graph."""
    print("--- Starting Step 3: Knowledge Graph Construction ---")
    
    try:
        # Initialization
        print(f"Initializing Vertex AI for project '{PROJECT_ID}' in '{LOCATION}'...")
        try:
            credentials = get_vertex_credentials()
            vertexai.init(project=PROJECT_ID, location=LOCATION, credentials=credentials)
            model = GenerativeModel(MODEL_NAME)
        except (FileNotFoundError, RuntimeError, DefaultCredentialsError, Exception) as e:
            print(f"Error during Vertex AI initialization: {e}")
            return

        enriched_data = load_json_data(ENRICHED_USER_GUIDE_PATH)
        api_spec = load_api_spec(RAW_API_SPEC_PATH)

        # Generate overarching context
        context_summary = generate_context_summary(api_spec, enriched_data)

        # Process chunks and build graph
        all_nodes: Dict[str, Dict[str, Any]] = {}
        all_edges: List[Dict[str, Any]] = []

        for i, chunk in enumerate(enriched_data):
            print(f"\n--- Processing Chunk {i+1}/{len(enriched_data)} ---")
            
            prompt = build_knowledge_graph_prompt(context_summary, chunk)
            graph_chunk = extract_graph_from_chunk(model, prompt)
            
            if graph_chunk and (graph_chunk.get("nodes") or graph_chunk.get("edges")):
                print(f"Extracted {len(graph_chunk.get('nodes', []))} nodes and {len(graph_chunk.get('edges', []))} edges.")
                merge_graphs(all_nodes, all_edges, graph_chunk)
            else:
                print("No graph data extracted from this chunk.")
            
            # Rate limiting
            time.sleep(1) # Simple delay to avoid overwhelming the API

        # Finalize and save graph
        final_graph = {
            "nodes": list(all_nodes.values()),
            "edges": all_edges
        }

        print(f"\n--- Knowledge Graph Construction Complete ---")
        print(f"Total unique nodes: {len(final_graph['nodes'])}")
        print(f"Total edges: {len(final_graph['edges'])}")

        with open(KNOWLEDGE_GRAPH_PATH, 'w', encoding='utf-8') as f:
            json.dump(final_graph, f, indent=4)
        
        print(f"Knowledge graph saved to: {KNOWLEDGE_GRAPH_PATH}")

    except FileNotFoundError as e:
        print(f"Error: {e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

if __name__ == "__main__":
    main() 