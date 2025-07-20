#!/usr/bin/env python3
"""
Test script for the Faiss vector database
Tests dimension handling, indexing, and search functionality
"""

import sys
import os
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_faiss_installation():
    """Test if Faiss is properly installed"""
    print("=== Testing Faiss Installation ===")
    
    try:
        import faiss
        print(f"✅ Faiss version: {faiss.__version__}")
        print(f"✅ CPU support: Available")
        
        # Test GPU support
        if faiss.get_num_gpus() > 0:
            print(f"✅ GPU support: {faiss.get_num_gpus()} GPU(s) available")
        else:
            print("ℹ️  GPU support: Not available (CPU only)")
        
        return True
        
    except ImportError as e:
        print(f"❌ Faiss not installed: {e}")
        return False

def test_vector_database_initialization():
    """Test vector database initialization with different dimensions"""
    print("\n=== Testing Vector Database Initialization ===")
    
    try:
        from knowledgeBase.agent.rag.core.vector_database import FaissVectorDatabase
        
        # Test with correct embedding dimension (1024 for Qwen3)
        print("Testing with 1024 dimensions (Qwen3 embedding size)...")
        db = FaissVectorDatabase(
            embedding_dimension=1024,
            index_type="FLAT",
            metric="cosine"
        )
        print("✅ Database initialized with 1024 dimensions")
        
        # Test with different index types
        print("Testing different index types...")
        
        # IVF index
        db_ivf = FaissVectorDatabase(
            embedding_dimension=1024,
            index_type="IVF",
            nlist=10,
            metric="cosine"
        )
        print("✅ IVF index initialized")
        
        # HNSW index
        db_hnsw = FaissVectorDatabase(
            embedding_dimension=1024,
            index_type="HNSW",
            metric="cosine"
        )
        print("✅ HNSW index initialized")
        
        return db
        
    except Exception as e:
        print(f"❌ Failed to initialize database: {e}")
        return None

def test_dimension_validation():
    """Test dimension validation and error handling"""
    print("\n=== Testing Dimension Validation ===")
    
    try:
        from knowledgeBase.agent.rag.core.vector_database import FaissVectorDatabase
        
        # Test invalid dimensions
        try:
            db = FaissVectorDatabase(embedding_dimension=0)
            print("❌ Should have failed with dimension 0")
            return False
        except ValueError:
            print("✅ Correctly rejected dimension 0")
        
        try:
            db = FaissVectorDatabase(embedding_dimension=-1)
            print("❌ Should have failed with negative dimension")
            return False
        except ValueError:
            print("✅ Correctly rejected negative dimension")
        
        # Test large dimension
        db = FaissVectorDatabase(embedding_dimension=2048)
        print("✅ Accepted large dimension (2048)")
        
        return True
        
    except Exception as e:
        print(f"❌ Dimension validation test failed: {e}")
        return False

def test_embedding_addition():
    """Test adding embeddings with dimension checking"""
    print("\n=== Testing Embedding Addition ===")
    
    try:
        from knowledgeBase.agent.rag.core.vector_database import FaissVectorDatabase
        from knowledgeBase.agent.rag.core.embedding_engine import EmbeddingResult
        import numpy as np
        import scipy.sparse as sp
        
        # Initialize database
        db = FaissVectorDatabase(embedding_dimension=1024, index_type="FLAT")
        
        # Create mock embedding results with correct dimensions
        embedding_results = []
        for i in range(5):
            # Create 1024-dimensional dense embedding
            dense_embedding = np.random.randn(1024).tolist()
            
            # Create sparse embedding
            sparse_data = np.random.randn(100)
            sparse_indices = np.random.randint(0, 1000, 100)
            sparse_embedding = sp.csr_matrix((sparse_data, (np.zeros(100), sparse_indices)), shape=(1, 1000))
            
            result = EmbeddingResult(
                chunk_id=f"test_chunk_{i}",
                dense_embedding=dense_embedding,
                sparse_embedding=sparse_embedding,
                embedding_model="test_model",
                embedding_dimension=1024,
                metadata={"test": True, "index": i}
            )
            embedding_results.append(result)
        
        # Add embeddings to database
        success = db.add_embeddings(embedding_results)
        if success:
            print(f"✅ Added {len(embedding_results)} embeddings successfully")
            print(f"   Database now has {db.total_vectors} vectors")
        else:
            print("❌ Failed to add embeddings")
            return False
        
        # Test dimension mismatch
        try:
            wrong_embedding = EmbeddingResult(
                chunk_id="wrong_dimension",
                dense_embedding=np.random.randn(512).tolist(),  # Wrong dimension
                embedding_model="test_model",
                embedding_dimension=512
            )
            db.add_embeddings([wrong_embedding])
            print("❌ Should have failed with wrong dimension")
            return False
        except ValueError:
            print("✅ Correctly rejected wrong dimension embedding")
        
        return db
        
    except Exception as e:
        print(f"❌ Embedding addition test failed: {e}")
        return None

def test_search_functionality(db):
    """Test search functionality"""
    print("\n=== Testing Search Functionality ===")
    
    try:
        import numpy as np
        
        # Create a query vector with correct dimension
        query_vector = np.random.randn(1024).tolist()
        
        # Test dense search
        print("Testing dense search...")
        dense_results = db.search_dense(query_vector, k=3)
        print(f"✅ Dense search returned {len(dense_results)} results")
        
        for i, result in enumerate(dense_results):
            print(f"   {i+1}. Chunk: {result.chunk_id}, Score: {result.score:.4f}")
        
        # Test wrong dimension query
        try:
            wrong_query = np.random.randn(512).tolist()
            db.search_dense(wrong_query, k=3)
            print("❌ Should have failed with wrong query dimension")
            return False
        except ValueError:
            print("✅ Correctly rejected wrong query dimension")
        
        return True
        
    except Exception as e:
        print(f"❌ Search test failed: {e}")
        return False

def test_save_load_functionality(db):
    """Test save and load functionality"""
    print("\n=== Testing Save/Load Functionality ===")
    
    try:
        from knowledgeBase.agent.rag.core.vector_database import FaissVectorDatabase
        
        # Save database
        save_dir = "test_vector_db"
        db.save_database(save_dir)
        print(f"✅ Database saved to {save_dir}")
        
        # Load database
        new_db = FaissVectorDatabase(embedding_dimension=1024)
        new_db.load_database(save_dir)
        print("✅ Database loaded successfully")
        
        # Verify loaded database
        stats = new_db.get_stats()
        print(f"   Loaded {stats['total_vectors']} vectors")
        print(f"   Embedding dimension: {stats['embedding_dimension']}")
        
        # Test search on loaded database
        import numpy as np
        query_vector = np.random.randn(1024).tolist()
        results = new_db.search_dense(query_vector, k=3)
        print(f"✅ Search on loaded database returned {len(results)} results")
        
        # Clean up
        import shutil
        shutil.rmtree(save_dir)
        print("✅ Cleaned up test files")
        
        return True
        
    except Exception as e:
        print(f"❌ Save/load test failed: {e}")
        return False

def test_with_real_embeddings():
    """Test with real embeddings from the embedding engine"""
    print("\n=== Testing with Real Embeddings ===")
    
    try:
        from knowledgeBase.agent.rag.core.embedding_engine import EmbeddingEngine
        from knowledgeBase.agent.rag.core.document_processor import DocumentProcessor
        from knowledgeBase.agent.rag.core.vector_database import FaissVectorDatabase
        
        # Check if processed chunks exist
        chunk_file = "storage/processed_chunks/semantic_chunks.json"
        if not os.path.exists(chunk_file):
            print(f"ℹ️  Skipping real embedding test - chunks not found: {chunk_file}")
            return True
        
        # Initialize components
        processor = DocumentProcessor()
        embedding_engine = EmbeddingEngine(ollama_model="dengcao/Qwen3-Embedding-0.6B:F16", batch_size=3)
        
        # Load a few chunks
        chunks = processor.load_chunks(chunk_file)
        sample_chunks = chunks[:10]  # Use 10 chunks for testing
        print(f"Loaded {len(sample_chunks)} chunks for testing")
        
        # Generate embeddings
        print("Generating embeddings with Ollama...")
        embedding_results = embedding_engine.embed_chunks(sample_chunks)
        
        # Get actual embedding dimension
        actual_dim = len(embedding_results[0].dense_embedding)
        print(f"✅ Detected embedding dimension: {actual_dim}")
        
        # Initialize vector database with correct dimension
        vector_db = FaissVectorDatabase(
            embedding_dimension=actual_dim,
            index_type="FLAT",  # Use FLAT for small test dataset
            metric="cosine"
        )
        
        # Add embeddings
        vector_db.add_embeddings(embedding_results)
        print(f"✅ Added {len(embedding_results)} real embeddings to database")
        
        # Test search
        query = "How to create a ticket in workspace?"
        print(f"Testing search with query: '{query}'")
        
        query_dense = embedding_engine.get_dense_embedding(query)
        dense_results = vector_db.search_dense(query_dense, k=5)
        
        print("Top search results:")
        for i, result in enumerate(dense_results):
            print(f"   {i+1}. Score: {result.score:.4f} | Chunk: {result.chunk_id}")
        
        # Test hybrid search
        hybrid_results = vector_db.search_hybrid(query, embedding_engine, k=5)
        print(f"✅ Hybrid search returned {len(hybrid_results)} results")
        
        return True
        
    except Exception as e:
        print(f"❌ Real embedding test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all vector database tests"""
    print("🧪 Starting Faiss Vector Database Tests\n")
    
    # Test 1: Faiss installation
    if not test_faiss_installation():
        print("\n❌ Cannot proceed without Faiss")
        return False
    
    # Test 2: Database initialization
    db = test_vector_database_initialization()
    if not db:
        print("\n❌ Database initialization failed")
        return False
    
    # Test 3: Dimension validation
    if not test_dimension_validation():
        print("\n❌ Dimension validation failed")
        return False
    
    # Test 4: Embedding addition
    db = test_embedding_addition()
    if not db:
        print("\n❌ Embedding addition failed")
        return False
    
    # Test 5: Search functionality
    if not test_search_functionality(db):
        print("\n❌ Search functionality failed")
        return False
    
    # Test 6: Save/load functionality
    if not test_save_load_functionality(db):
        print("\n❌ Save/load functionality failed")
        return False
    
    # Test 7: Real embeddings (optional)
    test_with_real_embeddings()
    
    print("\n🎉 All vector database tests passed!")
    print("\nDatabase Summary:")
    stats = db.get_stats()
    for key, value in stats.items():
        print(f"- {key}: {value}")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 