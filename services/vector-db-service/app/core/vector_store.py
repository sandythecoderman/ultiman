import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

class VectorStore:
    def __init__(self, model_name='all-MiniLM-L6-v2'):
        """
        Initializes the VectorStore.
        :param model_name: The name of the sentence-transformer model to use.
        """
        print("Initializing VectorStore...")
        self.model = SentenceTransformer(model_name)
        self.dimension = self.model.get_sentence_embedding_dimension()
        # Using IndexFlatL2 for simplicity. For large-scale use, a more complex index is better.
        self.index = faiss.IndexFlatL2(self.dimension)
        self.documents = []
        print(f"VectorStore initialized with model '{model_name}' (dimension: {self.dimension}).")

    def add_documents(self, docs: list[str]):
        """
        Adds a list of documents to the vector store.
        :param docs: A list of strings to add.
        """
        print(f"Adding {len(docs)} documents to the vector store.")
        embeddings = self.model.encode(docs, convert_to_tensor=False)
        self.index.add(np.array(embeddings, dtype=np.float32))
        self.documents.extend(docs)
        print(f"Successfully added documents. Total documents: {len(self.documents)}.")

    def search(self, query: str, k: int = 5) -> list[dict]:
        """
        Searches the vector store for the most similar documents to a query.
        :param query: The query string.
        :param k: The number of similar documents to return.
        :return: A list of dictionaries, each containing the 'content' and 'score'.
        """
        if self.index.ntotal == 0:
            return []

        print(f"Searching for top {k} results for query: '{query}'")
        query_embedding = self.model.encode([query])
        distances, indices = self.index.search(np.array(query_embedding, dtype=np.float32), k)
        
        results = []
        for i, idx in enumerate(indices[0]):
            if idx != -1: # FAISS returns -1 for no result
                results.append({
                    "content": self.documents[idx],
                    "score": float(distances[0][i])
                })
        print(f"Found {len(results)} results.")
        return results

# Example Usage:
if __name__ == '__main__':
    store = VectorStore()
    sample_docs = [
        "The sky is blue.",
        "The grass is green.",
        "The sun is bright.",
        "Large language models are a form of artificial intelligence."
    ]
    store.add_documents(sample_docs)
    search_results = store.search("What is AI?")
    print("Search Results:", search_results) 