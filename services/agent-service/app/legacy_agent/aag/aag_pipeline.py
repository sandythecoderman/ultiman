import sys
import os

# Add the parent directory to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from .core.query_engine import QueryEngine
from .core.reranker import Reranker
from .core.selector import Selector

class AAGPipeline:
    """
    Orchestrates the entire Knowledge-Augmented Generation (KAG) pipeline.
    """

    def __init__(self):
        """
        Initializes all the core components of the pipeline.
        """
        print("Initializing AAG Pipeline...")
        self.query_engine = QueryEngine()
        self.reranker = Reranker()
        self.selector = Selector()
        print("AAG Pipeline Initialized and Ready.")

    def run(self, query: str, top_k_search: int = 30, top_k_rerank: int = 5, return_candidates: bool = False):
        """
        Executes the full pipeline from query to final API selection.

        Args:
            query: The user's natural language query.
            top_k_search: The number of candidates to retrieve from each FAISS index.
            top_k_rerank: The number of candidates to send to the final LLM selector.
            return_candidates: If True, returns the list of top reranked candidates.

        Returns:
            If return_candidates is True, a list of candidate dictionaries.
            Otherwise, the operationId of the single best API for the query.
        """
        print(f"\n--- Running Pipeline for Query: '{query}' ---")

        # Step 1: Dual Semantic Search
        print(f"\n[Step 1/3] Searching for top {top_k_search} initial candidates...")
        initial_candidates = self.query_engine.search(query, k=top_k_search)
        if not initial_candidates:
            print("No candidates found. Exiting.")
            return "No suitable API found."

        # Step 2: Reranking with Cross-Encoder and OperationId Boost
        print(f"\n[Step 2/3] Reranking {len(initial_candidates)} candidates...")
        reranked_candidates = self.reranker.rerank(query, initial_candidates)
        if not reranked_candidates:
            print("Reranking produced no results. Exiting.")
            return "No suitable API found."

        # If requested, return the top candidates for the planner
        if return_candidates:
            return reranked_candidates[:top_k_rerank]

        # Step 3: Final Selection with LLM
        candidates_for_selection = reranked_candidates[:top_k_rerank]
        print(f"\n[Step 3/3] Sending top {len(candidates_for_selection)} candidates to LLM for final selection...")
        final_api_op_id = self.selector.select_best_api(query, candidates_for_selection)

        print("\n--- Pipeline Finished ---")
        return final_api_op_id if final_api_op_id else "LLM failed to select an API."

# Example Usage:
if __name__ == '__main__':
    # This example assumes that the FAISS indexes have already been created by run_ingestion.py
    # and that a valid rag_config.json with an API key is present.
    
    pipeline = AAGPipeline()
    
    test_query = "How can I get a list of all the events that have occurred?"
    
    best_api = pipeline.run(test_query)
    
    print(f"\n================================================")
    print(f"Query: '{test_query}'")
    print(f"Final Selected API: {best_api}")
    print(f"================================================")
