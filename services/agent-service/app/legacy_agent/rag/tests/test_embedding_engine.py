#!/usr/bin/env python3
"""
Test script for the embedding engine
Tests connection to Ollama and basic embedding functionality
"""

import sys
import os
import json
import logging
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(project_root))

try:
    from knowledgeBase.agent.rag.core.document_processor import DocumentProcessor
    from knowledgeBase.agent.rag.core.embedding_engine import EmbeddingEngine
except ImportError:
    # Try relative imports if absolute imports fail
    from document_processor import DocumentProcessor
    from embedding_engine import EmbeddingEngine

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_ollama_connection():
    """Test basic Ollama connection and model availability"""
    print("=== Testing Ollama Connection ===")
    
    try:
        embedding_engine = EmbeddingEngine(
            ollama_model="dengcao/Qwen3-Embedding-0.6B:F16",
            batch_size=3
        )
        print("✅ Successfully connected to Ollama and verified model")
        return embedding_engine
        
    except Exception as e:
        print(f"❌ Failed to connect to Ollama: {e}")
        print("Make sure Ollama is running with: ollama serve")
        print("And the model is available with: ollama pull dengcao/Qwen3-Embedding-0.6B:F16")
        return None

def test_single_embedding(embedding_engine):
    """Test single text embedding"""
    print("\n=== Testing Single Embedding ===")
    
    test_text = "How to create a new ticket in the workspace module?"
    
    try:
        # Test dense embedding
        dense_embedding = embedding_engine.get_dense_embedding(test_text)
        print(f"✅ Dense embedding generated: dimension {len(dense_embedding)}")
        print(f"   First 5 values: {dense_embedding[:5]}")
        
        # Test sparse embedding (need to fit first)
        embedding_engine.fit_sparse_embeddings([test_text, "Another test document for vocabulary"])
        sparse_embedding = embedding_engine.get_sparse_embedding(test_text)
        print(f"✅ Sparse embedding generated: shape {sparse_embedding.shape}, nnz: {sparse_embedding.nnz}")
        
        return True
        
    except Exception as e:
        print(f"❌ Failed to generate embeddings: {e}")
        return False

def test_chunk_processing():
    """Test processing of actual document chunks"""
    print("\n=== Testing Chunk Processing ===")
    
    # Check if processed chunks exist
    chunk_file = "storage/processed_chunks/semantic_chunks.json"
    
    if not os.path.exists(chunk_file):
        print(f"❌ Chunk file not found: {chunk_file}")
        print("Please run document_processor.py first to generate chunks")
        return False
    
    try:
        # Load a few chunks for testing
        processor = DocumentProcessor()
        chunks = processor.load_chunks(chunk_file)
        
        # Take a small sample
        sample_size = 5
        sample_chunks = chunks[:sample_size]
        print(f"✅ Loaded {len(chunks)} total chunks, using {len(sample_chunks)} for testing")
        
        return sample_chunks
        
    except Exception as e:
        print(f"❌ Failed to load chunks: {e}")
        return False

def test_full_embedding_pipeline(embedding_engine, chunks):
    """Test the complete embedding pipeline"""
    print("\n=== Testing Full Embedding Pipeline ===")
    
    try:
        # Generate embeddings
        print("Generating embeddings for sample chunks...")
        embedding_results = embedding_engine.embed_chunks(chunks)
        
        print(f"✅ Generated embeddings for {len(embedding_results)} chunks")
        
        # Test hybrid similarity
        query = "How to create a ticket?"
        print(f"\nTesting hybrid similarity with query: '{query}'")
        
        similarities = embedding_engine.hybrid_similarity(query, embedding_results)
        
        print(f"✅ Computed similarities for {len(similarities)} chunks")
        print("\nTop 3 most similar chunks:")
        
        for i, (chunk_id, score) in enumerate(similarities[:3]):
            chunk = next(c for c in chunks if c.chunk_id == chunk_id)
            print(f"{i+1}. Score: {score:.4f}")
            print(f"   Chunk ID: {chunk_id}")
            print(f"   Content: {chunk.content[:150]}...")
            print()
        
        return embedding_results
        
    except Exception as e:
        print(f"❌ Failed in embedding pipeline: {e}")
        return False

def test_save_load_embeddings(embedding_engine, embedding_results):
    """Test saving and loading embeddings"""
    print("=== Testing Save/Load Embeddings ===")
    
    try:
        output_file = "storage/embeddings/test_embeddings.pkl"
        
        # Save embeddings
        embedding_engine.save_embeddings(embedding_results, output_file)
        print(f"✅ Saved embeddings to {output_file}")
        
        # Load embeddings
        loaded_results = embedding_engine.load_embeddings(output_file)
        print(f"✅ Loaded {len(loaded_results)} embeddings")
        
        # Verify consistency
        if len(loaded_results) == len(embedding_results):
            print("✅ Save/load consistency verified")
        else:
            print("❌ Inconsistent embedding counts after save/load")
            
        return True
        
    except Exception as e:
        print(f"❌ Failed to save/load embeddings: {e}")
        return False

def main():
    """Run all embedding engine tests"""
    print("🧪 Starting Embedding Engine Tests\n")
    
    # Test 1: Ollama connection
    embedding_engine = test_ollama_connection()
    if not embedding_engine:
        print("\n❌ Cannot proceed without Ollama connection")
        return False
    
    # Test 2: Single embedding
    if not test_single_embedding(embedding_engine):
        print("\n❌ Basic embedding test failed")
        return False
    
    # Test 3: Load chunks
    chunks = test_chunk_processing()
    if not chunks:
        print("\n❌ Cannot proceed without chunks")
        return False
    
    # Test 4: Full pipeline
    embedding_results = test_full_embedding_pipeline(embedding_engine, chunks)
    if not embedding_results:
        print("\n❌ Full pipeline test failed")
        return False
    
    # Test 5: Save/load
    if not test_save_load_embeddings(embedding_engine, embedding_results):
        print("\n❌ Save/load test failed")
        return False
    
    print("\n🎉 All tests passed! Embedding engine is working correctly.")
    print(f"\nEmbedding Summary:")
    print(f"- Model: {embedding_engine.ollama_model}")
    print(f"- Dense dimension: {embedding_results[0].embedding_dimension}")
    print(f"- Sparse vocabulary: {len(embedding_engine.tfidf_vectorizer.vocabulary_)}")
    print(f"- Sample chunks processed: {len(embedding_results)}")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 