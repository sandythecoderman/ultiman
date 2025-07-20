import sys
import os
import json

# Add the parent directory to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from legacy.llm_client import LLMClient
from legacy.aag.aag_pipeline import AAGPipeline
from legacy.agent.task_decomposer import TaskDecomposer
from legacy.agent.planner import Planner, RAGPipeline # Using the placeholder RAG for now
from legacy.agent.executor import Executor
from legacy.agent.response_generator import ResponseGenerator
from legacy.agent.data_models import FinalOutput

class UnifiedOrchestratorAgent:
    """
    The main agent class that orchestrates the entire process from query to final output.
    """
    def __init__(self):
        print("Initializing the Unified Orchestrator Agent...")
        self.llm_client = LLMClient()
        self.rag_pipeline = RAGPipeline() # Using placeholder
        self.aag_pipeline = AAGPipeline()
        
        self.task_decomposer = TaskDecomposer(self.llm_client)
        self.planner = Planner(self.llm_client, self.rag_pipeline, self.aag_pipeline)
        self.executor = Executor(self.llm_client)
        self.response_generator = ResponseGenerator()
        print("Agent initialization complete.")

    def run(self, query: str) -> FinalOutput:
        """
        Runs the full agent workflow.
        1. Decomposes the task.
        2. Creates a plan for each sub-task.
        3. Executes the plan for each sub-task.
        4. Generates a final response.
        """
        print(f"\n--- Agent received new query: '{query}' ---")
        
        # 1. Decompose the task
        sub_tasks = self.task_decomposer.decompose_task(query)
        print(f"Task decomposed into {len(sub_tasks)} sub-task(s).")
        
        executed_plans = []
        for sub_task in sub_tasks:
            # 2. Create a plan
            plan = self.planner.create_plan(sub_task)
            
            # 3. Execute the plan
            executed_plan = self.executor.execute_plan(plan)
            executed_plans.append(executed_plan)
            
        # 4. Generate the final response
        final_output = self.response_generator.generate_response(executed_plans)
        
        print("\n--- Agent workflow complete. ---")
        return final_output

def main():
    """
    A simple main function to test the agent with a sample query.
    """
    agent = UnifiedOrchestratorAgent()
    
    # Example query from the user's request
    test_query = "Get the asset details of the server and network category summary along with the status of the assets"
    
    final_result = agent.run(test_query)
    
    print("\n\n==================== FINAL AGENT OUTPUT ====================")
    print("\n--- Summary Text ---")
    print(final_result.summary_text)
    
    print("\n--- Visual Pipeline (JSON) ---")
    print(json.dumps(final_result.visual_pipeline, indent=2))
    print("==========================================================")


if __name__ == '__main__':
    main()