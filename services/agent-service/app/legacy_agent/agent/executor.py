import sys
import os
import json
from typing import Dict, Any

# Add the parent directory to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from ..llm_client import LLMClient
from .data_models import ExecutionPlan, ExecutionStep

class Executor:
    """
    Executes a given plan, including determining parameters, making API calls, and verifying results.
    """
    def __init__(self, llm_client: LLMClient):
        self.llm_client = llm_client

    def _create_parameter_prompt(self, sub_task_description: str, api_details: Dict[str, Any]) -> str:
        """Creates a prompt for the LLM to determine the parameters for an API call."""
        
        # Extracting parameter details for the prompt
        parameters = api_details.get('parameters', [])
        param_details = "\n".join([f"- {p.get('name')} ({p.get('in')}): {p.get('description')}" for p in parameters])

        return f"""
You are an API parameter specialist. Your job is to determine the correct JSON body for an API call based on a task description and the API's specification.

**Task:** {sub_task_description}

**API Endpoint:** {api_details.get('summary')}
**Operation ID:** {api_details.get('operationId')}
**API Description:** {api_details.get('description')}

**Available Parameters:**
{param_details}

Based on the task, construct the necessary JSON object to be sent as the request body.
If a parameter is in the 'path', do not include it in the JSON body.
Only generate the JSON for parameters that are in the 'body' or 'query'.

If no parameters are needed, return an empty JSON object {{}}.

JSON Output:
"""

    def _call_api(self, step: ExecutionStep) -> Dict[str, Any]:
        """Simulates making an API call."""
        print(f"\n--- Executing API Call ---")
        print(f"Operation ID: {step.api_operation_id}")
        print(f"Parameters: {step.parameters}")
        
        # --- SIMULATION ---
        # In a real implementation, this would use a library like 'requests'
        # to make a real HTTP call to the API endpoint.
        # url = f"https://api.example.com/{step.api_details.get('path')}"
        # response = requests.post(url, json=step.parameters)
        # return response.json()
        
        print("--- (SIMULATED) API Call Successful ---")
        return {"status": "success", "message": f"Successfully executed {step.api_operation_id}"}
        # --- END SIMULATION ---

    def execute_plan(self, plan: ExecutionPlan) -> ExecutionPlan:
        """
        Executes each step in the plan.
        """
        print(f"\n--- Executing Plan for Sub-task: '{plan.sub_task.description}' ---")
        
        for step in plan.steps:
            try:
                step.status = "in_progress"
                
                # 1. Determine parameters with LLM
                param_prompt = self._create_parameter_prompt(plan.sub_task.description, step.api_details)
                # Use the correct method 'send_prompt' and provide a default agent_id
                param_response = self.llm_client.send_prompt('agent-001', param_prompt)
                
                if param_response.strip().startswith("```json"):
                    param_response = param_response.strip()[7:-3].strip()
                
                step.parameters = json.loads(param_response)

                # 2. Execute the API call
                result = self._call_api(step)
                step.result = result
                
                # 3. Verify the result (basic check for now)
                if result.get("status") == "success":
                    step.status = "completed"
                else:
                    step.status = "failed"
                
            except Exception as e:
                print(f"An error occurred during execution of step {step.api_operation_id}: {e}")
                step.status = "failed"
                step.result = str(e)

        return plan
