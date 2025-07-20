import faiss
import numpy as np
import json
import os
from sentence_transformers import SentenceTransformer
from .data_processor import DataProcessor

class IngestionService:
    """
    Handles the embedding and storage of API data into FAISS indexes.
    """

    def __init__(self, storage_path="legacy/aag/storage"):
        """
        Initializes the IngestionService.

        Args:
            storage_path: The directory to save and load FAISS indexes and metadata.
        """
        self.storage_path = storage_path
        os.makedirs(self.storage_path, exist_ok=True)
        
        self.embed_model = SentenceTransformer('sentence-transformers/all-mpnet-base-v2')
        self.embedding_dim = self.embed_model.get_sentence_embedding_dimension()

        # Initialize two separate FAISS indexes and metadata stores
        self.index1 = None  # For descriptions
        self.metadata1 = []
        self.index2 = None  # For summary + info
        self.metadata2 = []
        
        print(f"FAISS Ingestion Service initialized. Storage path: '{self.storage_path}'")

    def _initialize_indexes(self):
        """Initializes fresh FAISS indexes."""
        # Using IndexFlatL2 for exact, brute-force search. It's accurate and fast enough for this scale.
        self.index1 = faiss.IndexFlatL2(self.embedding_dim)
        self.metadata1 = []
        self.index2 = faiss.IndexFlatL2(self.embedding_dim)
        self.metadata2 = []
        print("FAISS indexes initialized.")

    def ingest_apis(self, api_file_path: str):
        """
        Processes and ingests APIs into the FAISS indexes.
        """
        self._initialize_indexes()
        processor = DataProcessor(api_file_path=api_file_path)
        
        embeddings1 = []
        embeddings2 = []

        print("Starting API ingestion process...")
        for api_data in processor.process_apis():
            # 1. Ingest description
            embeddings1.append(self.embed_model.encode(api_data["text_for_embedding_1"]))
            self.metadata1.append(api_data["full_api_details"])

            # 2. Ingest summary + info
            embeddings2.append(self.embed_model.encode(api_data["text_for_embedding_2"]))
            self.metadata2.append(api_data["full_api_details"])

        # Add embeddings to FAISS indexes in batches
        if embeddings1:
            self.index1.add(np.array(embeddings1).astype('float32'))
            print(f"Added {self.index1.ntotal} embeddings to the 'description' index.")
        
        if embeddings2:
            self.index2.add(np.array(embeddings2).astype('float32'))
            print(f"Added {self.index2.ntotal} embeddings to the 'summary_info' index.")
            
        self.save_indexes()

    def save_indexes(self):
        """Saves the FAISS indexes and metadata to disk."""
        print("Saving indexes and metadata to disk...")
        # Save index 1
        faiss.write_index(self.index1, os.path.join(self.storage_path, "descriptions.index"))
        with open(os.path.join(self.storage_path, "metadata1.json"), "w") as f:
            json.dump(self.metadata1, f)

        # Save index 2
        faiss.write_index(self.index2, os.path.join(self.storage_path, "summary_info.index"))
        with open(os.path.join(self.storage_path, "metadata2.json"), "w") as f:
            json.dump(self.metadata2, f)
        print("Save complete.")

    def load_indexes(self):
        """Loads the FAISS indexes and metadata from disk."""
        print("Loading indexes and metadata from disk...")
        # Load index 1
        self.index1 = faiss.read_index(os.path.join(self.storage_path, "descriptions.index"))
        with open(os.path.join(self.storage_path, "metadata1.json"), "r") as f:
            self.metadata1 = json.load(f)
        print(f"Loaded {self.index1.ntotal} embeddings/metadata for 'description' index.")

        # Load index 2
        self.index2 = faiss.read_index(os.path.join(self.storage_path, "summary_info.index"))
        with open(os.path.join(self.storage_path, "metadata2.json"), "r") as f:
            self.metadata2 = json.load(f)
        print(f"Loaded {self.index2.ntotal} embeddings/metadata for 'summary_info' index.")
        print("Load complete.")

# Example Usage:
# if __name__ == '__main__':
#     service = IngestionService()
#     service.ingest_apis(api_file_path='../../data/enhanced_apis.json')
#
#     # To use the loaded indexes:
#     # loaded_service = IngestionService()
#     # loaded_service.load_indexes()