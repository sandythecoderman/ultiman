import sys
import os
from typing import List

# Add the parent directory to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from legacy.agent.data_models import ExecutionPlan, FinalOutput, JSONOutputNode

class ResponseGenerator:
    """
    Generates the final user-facing output, including a JSON pipeline and a text summary.
    """
    def generate_response(self, executed_plans: List[ExecutionPlan]) -> FinalOutput:
        """
        Formats the results from all executed plans into the final output structure.
        """
        summary_parts = []
        visual_pipeline_nodes = []
        node_id_counter = 1

        summary_parts.append("The agent has completed the following tasks:")

        for plan in executed_plans:
            summary_parts.append(f"\nFor the task: '{plan.sub_task.description}':")
            
            for step in plan.steps:
                if step.status == 'completed':
                    summary_parts.append(f"- Successfully used the API '{step.api_operation_id}' because: {step.reasoning}")
                    
                    node = JSONOutputNode(
                        node_id=f"node_{node_id_counter}",
                        operation_id=step.api_operation_id,
                        description=step.api_details.get('summary', 'No description available.'),
                        reasoning=step.reasoning,
                        parameters=step.parameters,
                        dependencies=[] # Basic logic for now, can be enhanced later
                    )
                    visual_pipeline_nodes.append(node)
                    node_id_counter += 1
                else:
                    summary_parts.append(f"- Failed to use the API '{step.api_operation_id}'. Reason: {step.result}")

        final_summary = "\n".join(summary_parts)
        
        # The visual pipeline is a dictionary, as per the data model
        visual_pipeline = {"nodes": [node.__dict__ for node in visual_pipeline_nodes]}

        return FinalOutput(
            summary_text=final_summary,
            visual_pipeline=visual_pipeline
        )
