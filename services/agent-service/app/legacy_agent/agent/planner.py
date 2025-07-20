import sys
import os
import json
from typing import List

# Add the parent directory to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from legacy.llm_client import LLMClient
from legacy.aag.aag_pipeline import AAGPipeline
# Assuming a RAG pipeline class exists, we'll create a placeholder for now
# from legacy.rag.rag_pipeline import RAGPipeline 
from legacy.agent.data_models import SubTask, ExecutionPlan, ExecutionStep

# Placeholder for the RAG pipeline
class RAGPipeline:
    def run(self, query: str) -> str:
        print(f"--- RAG Query (Simulated): {query} ---")
        return "Simulated RAG Output: This documentation explains how to create users and manage tickets."

class Planner:
    """
    Creates a detailed, step-by-step execution plan for a given sub-task.
    It uses RAG for procedural context and AAG to find the right APIs.
    """
    def __init__(self, llm_client: LLMClient, rag_pipeline: RAGPipeline, aag_pipeline: AAGPipeline):
        self.llm_client = llm_client
        self.rag_pipeline = rag_pipeline
        self.aag_pipeline = aag_pipeline

    def _create_planning_prompt(self, sub_task_description: str, rag_context: str, aag_api_candidates: List[dict]) -> str:
        """Creates a prompt for the LLM to generate an execution plan."""
        
        # We need to format the API candidates for the prompt
        # The reranker returns a list of dicts, where the original spec is nested.
        api_specs = [api['api_details']['details'] for api in aag_api_candidates]
        formatted_apis = "\n".join([f"- {api.get('operationId')}: {api.get('summary') or api.get('description', 'No description available')}" for api in api_specs])

        return f"""
You are a meticulous planning agent. Your goal is to create a step-by-step plan to accomplish a task, using the provided context and a list of available APIs.

**Task:** {sub_task_description}

**Context from Documentation (RAG):**
{rag_context}

**Available APIs (AAG):**
{formatted_apis}

Based on all this information, determine the single best API to use for the task.
Then, create a JSON object with the following structure:
{{
  "api_operation_id": "The operationId of the chosen API",
  "reasoning": "A brief explanation of why you chose this API and how it helps accomplish the task."
}}

JSON Output:
"""

    def create_plan(self, sub_task: SubTask) -> ExecutionPlan:
        """
        Generates an execution plan for a single sub-task.
        """
        print(f"\n--- Creating Plan for Sub-task: '{sub_task.description}' ---")
        
        # 1. Use RAG to get procedural context
        rag_context = self.rag_pipeline.run(sub_task.description)

        # 2. Use AAG to find relevant APIs
        print(f"--- AAG Query: {sub_task.description} ---")
        # Call the pipeline to get the top candidates instead of just the final result
        aag_candidates = self.aag_pipeline.run(sub_task.description, return_candidates=True)

        if not aag_candidates:
            print("Warning: AAG returned no candidates. Skipping step.")
            return ExecutionPlan(sub_task=sub_task)

        # 3. Use LLM to create the plan (select the best API and provide reasoning)
        prompt = self._create_planning_prompt(sub_task.description, rag_context, aag_candidates)
        
        try:
            # Use the correct method 'send_prompt' and provide a default agent_id
            response_text = self.llm_client.send_prompt('agent-001', prompt)
            if response_text.strip().startswith("```json"):
                response_text = response_text.strip()[7:-3].strip()
            
            plan_data = json.loads(response_text) if response_text else {}

            # 4. Assemble the ExecutionPlan
            chosen_op_id = plan_data.get("api_operation_id")
            
            # Find the full details for the chosen API from the candidates list
            api_details = {}
            for candidate in aag_candidates:
                if candidate['api_details']['details']['operationId'] == chosen_op_id:
                    api_details = candidate['api_details']['details']
                    break

            step = ExecutionStep(
                api_operation_id=chosen_op_id,
                reasoning=plan_data.get("reasoning", ""),
                api_details=api_details
            )
            
            plan = ExecutionPlan(sub_task=sub_task, steps=[step])
            print(f"--- Plan Created: Use API '{chosen_op_id}' ---")
            return plan
        
        except json.JSONDecodeError:
            print(f"Warning: LLM did not return valid JSON for planning. Skipping step.")
            return ExecutionPlan(sub_task=sub_task) # Return an empty plan

        except Exception as e:
            print(f"An unexpected error occurred during planning: {e}")
            return ExecutionPlan(sub_task=sub_task) # Return an empty plan on other errors
