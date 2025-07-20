import sys
import os
import json
from typing import List

# Add the parent directory to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from legacy.llm_client import LLMClient
from legacy.agent.data_models import SubTask

class TaskDecomposer:
    """
    Breaks down a high-level user query into a series of smaller, logical sub-tasks.
    """
    def __init__(self, llm_client: LLMClient):
        self.llm_client = llm_client

    def _create_prompt(self, query: str) -> str:
        """Creates the prompt for the LLM to decompose the task."""
        return f"""
You are a task decomposition engine. Your purpose is to break down a complex user request into a series of smaller, actionable, and logical sub-tasks.
Analyze the following user query and break it down into a sequence of steps.
Each sub-task should represent a distinct action or goal.

Return the output as a JSON array of objects, where each object has a "description" field.

User Query: "{query}"

JSON Output:
"""

    def decompose_task(self, query: str) -> List[SubTask]:
        """
        Takes a user query, sends it to an LLM, and parses the response to create a list of SubTask objects.
        """
        prompt = self._create_prompt(query)
        
        try:
            # Use the correct method 'send_prompt' and provide a default agent_id
            response_text = self.llm_client.send_prompt('agent-001', prompt)
            
            # Clean the response to ensure it's valid JSON
            # The LLM might return the JSON wrapped in markdown ```json ... ```
            if response_text.strip().startswith("```json"):
                response_text = response_text.strip()[7:-3].strip()

            decomposed_tasks = json.loads(response_text)
            
            sub_tasks = []
            for task_data in decomposed_tasks:
                if "description" in task_data:
                    sub_tasks.append(
                        SubTask(
                            original_query=query,
                            description=task_data["description"]
                        )
                    )
            return sub_tasks

        except json.JSONDecodeError as e:
            print(f"Error decoding JSON from LLM response: {e}")
            # Fallback: create a single task with the original query
            return [SubTask(original_query=query, description=query)]
        except Exception as e:
            print(f"An unexpected error occurred in TaskDecomposer: {e}")
            return [SubTask(original_query=query, description=query)]
