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
from dotenv import load_dotenv
from tavily import TavilyClient

# --- Configuration ---
load_dotenv()
MODEL_NAME = "gemini-2.5-flash"
PROJECT_ID = "ultiman"
LOCATION = "us-central1"
DATA_DIR = "data"
KNOWLEDGE_GRAPH_PATH = os.path.join(DATA_DIR, "knowledge_graph.json")
FINAL_KNOWLEDGE_GRAPH_PATH = os.path.join(DATA_DIR, "final_knowledge_graph.json")
CREDENTIALS_PATH = "Ultiman-cred.json"

# Initialize Tavily client for web searches
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
if not TAVILY_API_KEY:
    raise ValueError("TAVILY_API_KEY not found in environment variables.")
tavily = TavilyClient(api_key=TAVILY_API_KEY)

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

def load_knowledge_graph(file_path: str) -> Dict[str, List[Dict[str, Any]]]:
    """Loads the knowledge graph from a JSON file."""
    print(f"Loading knowledge graph from: {file_path}")
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def search_web_for_concept(concept_name: str) -> str:
    """Performs a web search for a given concept and returns the most relevant result."""
    print(f"Searching web for: '{concept_name}'...")
    try:
        response = tavily.search(query=f"What is {concept_name} in the context of IT and software?", max_results=3)
        return " ".join([result['content'] for result in response['results']])
    except Exception as e:
        print(f"Error during web search for '{concept_name}': {e}")
        return ""

def build_summarization_prompt(concept_name: str, search_results: str) -> str:
    """Creates a prompt for the LLM to summarize search results."""
    return (
        "Based on the following information from a web search, please provide a clear and concise "
        f"one-paragraph summary that defines the concept of '{concept_name}' and explains its primary purpose "
        "and benefits in the context of IT platforms and software. The summary should be easy for a non-expert "
        "to understand.\n\n"
        f"--- Search Results ---\n{search_results}\n\n--- Summary ---"
    )

def get_summary_from_llm(model: GenerativeModel, prompt: str) -> str:
    """
    Sends a prompt to the model and returns the summarized text.
    Includes exponential backoff for rate limiting.
    """
    max_retries = 3
    base_delay = 5  # seconds

    for attempt in range(max_retries):
        try:
            response = model.generate_content(prompt)
            return response.text.strip()
        except exceptions.ResourceExhausted as e:
            if attempt < max_retries - 1:
                delay = base_delay * (2 ** attempt) + random.uniform(0, 1)
                print(f"Warning: Resource exhausted. Retrying in {delay:.2f} seconds...")
                time.sleep(delay)
            else:
                print(f"Error: Max retries reached for resource exhaustion. Skipping summary. Error: {e}")
                return ""
        except Exception as e:
            print(f"An unhandled error occurred during summarization: {e}")
            return ""
    return ""

# --- Main Execution ---

def main():
    """Main function to enrich the knowledge graph with external data."""
    print("--- Starting Step 4: Enrich with External Knowledge ---")
    
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

        knowledge_graph = load_knowledge_graph(KNOWLEDGE_GRAPH_PATH)
        nodes_to_enrich = [
            node for node in knowledge_graph.get("nodes", []) 
            if node.get("type") in ["Concept", "Feature"]
        ]

        print(f"Found {len(nodes_to_enrich)} 'Concept' or 'Feature' nodes to enrich.")

        # Process nodes
        for i, node in enumerate(nodes_to_enrich):
            node_id = node.get("id")
            if not node_id:
                continue
            
            print(f"\n--- Enriching Node {i+1}/{len(nodes_to_enrich)}: {node_id} ---")
            
            search_results = search_web_for_concept(node_id)
            if not search_results:
                print(f"Could not find web results for '{node_id}'. Skipping.")
                continue

            summarization_prompt = build_summarization_prompt(node_id, search_results)
            external_summary = get_summary_from_llm(model, summarization_prompt)

            if external_summary:
                node["external_knowledge"] = external_summary
                print(f"Successfully enriched node '{node_id}'.")
            else:
                print(f"Failed to generate summary for node '{node_id}'.")

            time.sleep(2) # Rate limiting for search and LLM APIs

        # Save the final, enriched graph
        print("\n--- Enrichment Process Complete ---")
        with open(FINAL_KNOWLEDGE_GRAPH_PATH, 'w', encoding='utf-8') as f:
            json.dump(knowledge_graph, f, indent=4)
        
        print(f"Final, enriched knowledge graph saved to: {FINAL_KNOWLEDGE_GRAPH_PATH}")

    except (FileNotFoundError, ValueError) as e:
        print(f"Error: {e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

if __name__ == "__main__":
    main() 