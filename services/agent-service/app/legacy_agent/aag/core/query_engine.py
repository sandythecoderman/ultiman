import faiss
import numpy as np
import json
import os
from sentence_transformers import SentenceTransformer

class QueryEngine:
    """
    Handles the dual-search logic against the FAISS indexes.
    """

    def __init__(self, storage_path="legacy/aag/storage"):
        """
        Initializes the QueryEngine and loads the necessary models and data.
        """
        self.storage_path = storage_path
        self.embed_model = SentenceTransformer('sentence-transformers/all-mpnet-base-v2')
        
        self.index1 = None
        self.metadata1 = []
        self.index2 = None
        self.metadata2 = []
        
        self.load_data()

    def load_data(self):
        """Loads the FAISS indexes and metadata from disk."""
        print("Loading indexes and metadata for Query Engine...")
        try:
            # Load index 1 (descriptions)
            self.index1 = faiss.read_index(os.path.join(self.storage_path, "descriptions.index"))
            with open(os.path.join(self.storage_path, "metadata1.json"), "r") as f:
                self.metadata1 = json.load(f)
            print(f"Loaded 'description' index with {self.index1.ntotal} entries.")

            # Load index 2 (summary + info)
            self.index2 = faiss.read_index(os.path.join(self.storage_path, "summary_info.index"))
            with open(os.path.join(self.storage_path, "metadata2.json"), "r") as f:
                self.metadata2 = json.load(f)
            print(f"Loaded 'summary_info' index with {self.index2.ntotal} entries.")
            print("Query Engine ready.")
        except Exception as e:
            print(f"Error loading data: {e}. Did you run the ingestion script first?")
            raise

    def search(self, query: str, k: int = 30) -> list:
        """
        Performs a dual semantic search and returns a combined pool of candidates.

        Args:
            query: The user's search query.
            k: The number of candidates to retrieve from EACH index.

        Returns:
            A deduplicated list of candidate API details.
        """
        if not self.index1 or not self.index2:
            print("Indexes are not loaded. Cannot perform search.")
            return []

        print(f"Performing dual search for query: '{query}'")
        query_embedding = self.embed_model.encode([query]).astype('float32')

        # Search in index 1
        distances1, indices1 = self.index1.search(query_embedding, k)
        
        # Search in index 2
        distances2, indices2 = self.index2.search(query_embedding, k)

        # --- Candidate Pooling and Deduplication ---
        candidate_pool = {} # Use a dict to automatically handle duplicates by operationId
        
        # Process results from index 1
        for i, idx in enumerate(indices1[0]):
            if idx != -1: # FAISS returns -1 for no result
                api_details = self.metadata1[idx]
                op_id = api_details['details']['operationId']
                if op_id not in candidate_pool:
                    candidate_pool[op_id] = {
                        "api_details": api_details,
                        "score": float(distances1[0][i]), # Lower L2 distance is better
                        "source": "description"
                    }

        # Process results from index 2
        for i, idx in enumerate(indices2[0]):
            if idx != -1:
                api_details = self.metadata2[idx]
                op_id = api_details['details']['operationId']
                # If it exists, we can decide to keep the one with the better score
                if op_id not in candidate_pool or float(distances2[0][i]) < candidate_pool[op_id]["score"]:
                     candidate_pool[op_id] = {
                        "api_details": api_details,
                        "score": float(distances2[0][i]),
                        "source": "summary_info"
                    }
        
        print(f"Found {len(candidate_pool)} unique candidates from dual search.")
        
        # Return a list of the candidate details, sorted by score
        sorted_candidates = sorted(candidate_pool.values(), key=lambda x: x['score'])
        return sorted_candidates

# Example Usage:
# if __name__ == '__main__':
#     engine = QueryEngine()
#     test_query = "how do I get a list of events"
#     results = engine.search(test_query)
#     print(f"\nTop 5 results for '{test_query}':")
#     for i, res in enumerate(results[:5]):
#         print(f"  {i+1}. OpID: {res['api_details']['details']['operationId']} (Score: {res['score']:.4f}, Source: {res['source']})")
