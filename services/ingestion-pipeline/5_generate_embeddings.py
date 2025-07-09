import os
import json
import time
import faiss
import numpy as np
from tqdm import tqdm
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Any

# --- Constants ---
MODEL_NAME = "BAAI/bge-large-en-v1.5"
BATCH_SIZE = 16
DATA_DIR = "data"

# Input files
RAW_API_SPEC_FILE = os.path.join(DATA_DIR, "raw_api_spec.json")
ENRICHED_DOCS_FILE = os.path.join(DATA_DIR, "enriched_user_guide.json")

# Output files for API Vector DB
API_INDEX_FILE = os.path.join(DATA_DIR, "api_index.faiss")
API_CONTENT_FILE = os.path.join(DATA_DIR, "api_content.json")

# Output files for User Guide Vector DB
DOCS_INDEX_FILE = os.path.join(DATA_DIR, "docs_index.faiss")
DOCS_CONTENT_FILE = os.path.join(DATA_DIR, "docs_content.json")


def load_json_data(file_path: str):
    """Loads data from a JSON file."""
    print(f"Loading data from: {file_path}")
    if not os.path.exists(file_path):
        print(f"Error: Input file not found at {file_path}")
        return None
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def generate_embeddings(model: SentenceTransformer, texts: List[str]) -> np.ndarray:
    """Generates embeddings for a list of texts with a progress bar."""
    print(f"Generating embeddings for {len(texts)} texts...")
    return model.encode(
        texts,
        batch_size=BATCH_SIZE,
        show_progress_bar=True,
        convert_to_numpy=True,
    )


def create_vector_db(model: SentenceTransformer, texts: List[str]):
    """Creates a FAISS index and a content map from a list of texts."""
    embeddings = generate_embeddings(model, texts)
    dimension = embeddings.shape[1]
    
    print(f"Building FAISS index of shape {embeddings.shape}...")
    index = faiss.IndexFlatL2(dimension)
    index.add(embeddings.astype(np.float32))
    
    content_map = [{"text": text} for text in texts]
    return index, content_map


def save_vector_db(index: faiss.Index, content: List[Dict], index_path: str, content_path: str):
    """Saves the FAISS index and content map to disk."""
    print(f"Saving FAISS index to {index_path}...")
    faiss.write_index(index, index_path)
    
    print(f"Saving content map to {content_path}...")
    with open(content_path, 'w', encoding='utf-8') as f:
        json.dump(content, f, indent=2)


def generate_api_texts(api_data: List[Dict[str, Any]]) -> List[str]:
    """Generates descriptive text sentences for each API endpoint."""
    texts = []
    for endpoint in api_data:
        method = endpoint.get("method", "N/A").upper()
        path = endpoint.get("path", "")
        summary = endpoint.get("summary", "No description available.")
        tags = ", ".join(endpoint.get("tags", []))
        # Create a more context-rich sentence including the tags
        text = f"API Endpoint for {tags}: {method} {path}. Description: {summary}"
        texts.append(text)
    return texts


def main():
    """
    Main function to generate embeddings for both API specs and user documents,
    creating two separate vector databases.
    """
    print("--- Starting Step 5: Generate Embeddings (Dual Vector DB) ---")

    print(f"Loading Hugging Face embedding model: {MODEL_NAME}...")
    model = SentenceTransformer(MODEL_NAME, trust_remote_code=True)
    print("Model loaded successfully.")

    # --- Process API Specification ---
    print("\n--- Processing API Specification ---")
    api_data = load_json_data(RAW_API_SPEC_FILE)
    if api_data:
        api_texts = generate_api_texts(api_data)
        api_index, api_content_map = create_vector_db(model, api_texts)
        save_vector_db(api_index, api_content_map, API_INDEX_FILE, API_CONTENT_FILE)
        print("API Vector DB created successfully.")

    # --- Process Enriched User Guide ---
    print("\n--- Processing Enriched User Guide ---")
    docs_data = load_json_data(ENRICHED_DOCS_FILE)
    if docs_data:
        # Use the high-quality, LLM-generated summary for embedding
        doc_texts = [item.get("enrichment", {}).get("summary", "") for item in docs_data]
        docs_index, docs_content_map = create_vector_db(model, doc_texts)
        save_vector_db(docs_index, docs_content_map, DOCS_INDEX_FILE, DOCS_CONTENT_FILE)
        print("User Guide Vector DB created successfully.")

    print("\n--- All Embeddings and Indexes Generated Successfully ---")


if __name__ == "__main__":
    main() 