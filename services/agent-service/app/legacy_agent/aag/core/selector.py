import json
import sys
import os

# Add the root project directory to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from ...llm_client import LLMClient

class Selector:
    """
    Uses an LLM to select the single best API from a list of top candidates,
    using the full, original API specification for maximum context.
    """

    def __init__(self, agent_id='agent-001', original_api_path='data/infraon-api.json'):
        """
        Initializes the Selector.

        Args:
            agent_id: The agent_id from the rag_config.json to use for the LLM call.
            original_api_path: Path to the ground-truth infraon-api.json file.
        """
        self.llm_client = LLMClient()
        self.agent_id = agent_id
        self._load_original_apis(original_api_path)
        print(f"Selector initialized to use LLM agent: {self.agent_id}")

    def _load_original_apis(self, api_path):
        """Loads the original API file and creates a lookup map."""
        print(f"Loading ground-truth API specs from {api_path}...")
        try:
            with open(api_path, 'r', encoding='utf-8') as f:
                apis = json.load(f)
            # Create a mapping from operationId to the full API object
            self.api_lookup = {api['operationId']: api for api in apis if 'operationId' in api}
            print(f"Created lookup for {len(self.api_lookup)} original APIs.")
        except Exception as e:
            print(f"Error loading original API file: {e}")
            self.api_lookup = {}

    def _create_prompt(self, query: str, top_candidates: list) -> str:
        """
        Creates a detailed, structured prompt for the LLM using the original API specs.
        """
        prompt = "You are an expert API routing agent. Your task is to analyze a user's query and a list of candidate API specifications to determine the single best API to fulfill the user's request.\n\n"
        prompt += f"USER QUERY: \"{query}\"\n\n"
        prompt += "Analyze the following candidate APIs using their full, original specification. Pay close attention to the 'path', 'method', 'description', 'summary', 'parameters', and 'responses' to understand what each API truly does.\n\n"
        
        prompt += "--- CANDIDATE APIS (Full Specification) ---\n"
        for i, candidate in enumerate(top_candidates):
            op_id = candidate['api_details']['details']['operationId']
            original_api_spec = self.api_lookup.get(op_id)
            
            if original_api_spec:
                prompt += f"\nCANDIDATE {i+1}: (operationId: {op_id})\n"
                prompt += json.dumps(original_api_spec, indent=2)
                prompt += "\n"
            else:
                prompt += f"\nCANDIDATE {i+1}: (operationId: {op_id}) - Original spec not found.\n"

        prompt += "\n--- INSTRUCTIONS ---\n"
        prompt += "Based on your analysis, which single API is the absolute best choice to handle the user's query? Please respond with ONLY the 'operationId' of your chosen API and nothing else. Do not add any explanation or surrounding text."
        
        return prompt

    def select_best_api(self, query: str, top_candidates: list) -> str:
        """
        Sends the prompt to the LLM and returns the selected operationId.
        """
        if not top_candidates or not self.api_lookup:
            return None

        print(f"Sending {len(top_candidates)} candidates to LLM for final selection using full specs...")
        
        prompt = self._create_prompt(query, top_candidates)
        
        try:
            response = self.llm_client.send_prompt(self.agent_id, prompt)
            selected_op_id = response.strip()
            print(f"LLM selected API: {selected_op_id}")
            return selected_op_id
        except Exception as e:
            print(f"An error occurred during LLM selection: {e}")
            return None