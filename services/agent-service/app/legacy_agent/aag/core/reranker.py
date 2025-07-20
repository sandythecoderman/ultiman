from sentence_transformers.cross_encoder import CrossEncoder
import re

class Reranker:
    """
    Reranks candidates using a CrossEncoder and an operationId similarity boost.
    """

    def __init__(self, model_name='cross-encoder/ms-marco-MiniLM-L-6-v2'):
        """
        Initializes the Reranker.
        
        Args:
            model_name: The name of the CrossEncoder model to use.
        """
        self.model = CrossEncoder(model_name)
        print(f"Reranker initialized with model: {model_name}")

    def _get_operation_id_score(self, query: str, operation_id: str) -> float:
        """
        Calculates a similarity score based on token overlap between the query and operationId.
        """
        # Preprocess and tokenize query
        query_tokens = set(re.split(r'\s+|_', query.lower()))

        # Preprocess and tokenize operation_id (split by _ and camelCase)
        op_id_parts = re.split(r'[_.]', operation_id)
        op_id_tokens = set()
        for part in op_id_parts:
            # Split camelCase
            camel_case_parts = re.findall(r'[A-Z]?[a-z]+|[A-Z]+(?=[A-Z][a-z]|\d|\W|$)|\d+', part)
            op_id_tokens.update([p.lower() for p in camel_case_parts])
        
        # Jaccard Similarity
        intersection = len(query_tokens.intersection(op_id_tokens))
        union = len(query_tokens.union(op_id_tokens))
        
        return intersection / union if union > 0 else 0.0

    def rerank(self, query: str, candidates: list, op_id_weight: float = 0.2) -> list:
        """
        Reranks a list of candidates based on a hybrid scoring model.

        Args:
            query: The user's search query.
            candidates: The list of candidates from the QueryEngine.
            op_id_weight: The weight to give to the operation_id score (0.0 to 1.0).

        Returns:
            A sorted list of candidates with their new hybrid scores.
        """
        if not candidates:
            return []

        print(f"Reranking {len(candidates)} candidates...")
        
        # Prepare pairs for the CrossEncoder
        cross_encoder_pairs = []
        for candidate in candidates:
            details = candidate['api_details']['details']
            text = f"{details.get('summary', '')} {details.get('description', '')}"
            cross_encoder_pairs.append([query, text.strip()])

        # Get scores from the model
        cross_encoder_scores = self.model.predict(cross_encoder_pairs, show_progress_bar=True)

        # Calculate hybrid scores
        reranked_results = []
        for i, candidate in enumerate(candidates):
            op_id = candidate['api_details']['details']['operationId']
            
            ce_score = cross_encoder_scores[i]
            op_id_score = self._get_operation_id_score(query, op_id)
            
            # Combine scores. The cross-encoder score is the primary factor.
            hybrid_score = (1 - op_id_weight) * ce_score + op_id_weight * op_id_score
            
            reranked_results.append({
                "api_details": candidate['api_details'],
                "score": float(hybrid_score)
            })

        # Sort by the new hybrid score in descending order
        reranked_results.sort(key=lambda x: x['score'], reverse=True)
        
        print("Reranking complete.")
        return reranked_results

# Example Usage:
# if __name__ == '__main__':
#     # This is a simplified example. In a real scenario, you'd get candidates from the QueryEngine.
#     reranker = Reranker()
#     test_query = "get list of events"
#     test_candidates = [
#         {'api_details': {'details': {'operationId': 'ux_common_events_events_retrieve', 'summary': 'Gets a list of events', 'description': 'This endpoint retrieves a paginated list of all events.'}}},
#         {'api_details': {'details': {'operationId': 'ux_common_incidents_list', 'summary': 'Get incidents', 'description': 'This endpoint gets incident reports.'}}}
#     ]
#     
#     final_ranking = reranker.rerank(test_query, test_candidates)
#     
#     print("\nFinal Ranking:")
#     for i, res in enumerate(final_ranking):
#         print(f"  {i+1}. OpID: {res['api_details']['details']['operationId']} (Score: {res['score']:.4f})")