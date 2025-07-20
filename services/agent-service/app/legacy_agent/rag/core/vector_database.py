"""
Faiss Vector Database for RAG System
High-performance vector storage and semantic search with proper dimension handling
"""

import os
import json
import pickle
import logging
import numpy as np
from typing import List, Dict, Any, Optional, Tuple, Union
from dataclasses import dataclass, asdict
from pathlib import Path
import time

import faiss
import scipy.sparse as sp

from .embedding_engine import EmbeddingResult, EmbeddingEngine
from .document_processor import DocumentChunk

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class SearchResult:
    """Represents a search result from the vector database"""
    chunk_id: str
    score: float
    dense_score: float
    sparse_score: Optional[float] = None
    hybrid_score: Optional[float] = None
    metadata: Dict[str, Any] = None
    content: str = ""
    
    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}

class FaissVectorDatabase:
    """High-performance vector database using Faiss with hybrid search capabilities"""
    
    def __init__(self, 
                 embedding_dimension: int = 1024,
                 index_type: str = "IVF",
                 nlist: int = 100,
                 use_gpu: bool = False,
                 metric: str = "cosine"):
        """
        Initialize the Faiss vector database
        
        Args:
            embedding_dimension: Dimension of dense embeddings (critical to get right!)
            index_type: Type of Faiss index ('flat', 'IVF', 'HNSW')
            nlist: Number of clusters for IVF index
            use_gpu: Whether to use GPU acceleration (if available)
            metric: Distance metric ('cosine', 'l2', 'ip')
        """
        self.embedding_dimension = embedding_dimension
        self.index_type = index_type.upper()
        self.nlist = nlist
        self.use_gpu = use_gpu
        self.metric = metric.lower()
        
        # Initialize indices
        self.dense_index = None
        self.sparse_index_data = None  # For sparse embeddings (TF-IDF)
        
        # Metadata storage
        self.chunk_metadata = {}  # chunk_id -> metadata
        self.id_to_chunk_id = {}  # internal_id -> chunk_id
        self.chunk_id_to_id = {}  # chunk_id -> internal_id
        self.next_id = 0
        
        # Sparse embedding components
        self.sparse_embeddings = None
        self.sparse_chunk_ids = []
        
        # Database state
        self.is_trained = False
        self.total_vectors = 0
        
        logger.info(f"FaissVectorDatabase initialized:")
        logger.info(f"  - Embedding dimension: {embedding_dimension}")
        logger.info(f"  - Index type: {index_type}")
        logger.info(f"  - Metric: {metric}")
        logger.info(f"  - GPU: {use_gpu}")
        
        self._validate_dimension()
        self._initialize_index()
    
    def _validate_dimension(self):
        """Validate that the embedding dimension is correct"""
        if self.embedding_dimension <= 0:
            raise ValueError(f"Embedding dimension must be positive, got: {self.embedding_dimension}")
        
        if self.embedding_dimension % 2 != 0 and self.index_type == "HNSW":
            logger.warning(f"HNSW works better with even dimensions. Current: {self.embedding_dimension}")
        
        logger.info(f"✅ Embedding dimension validated: {self.embedding_dimension}")
    
    def _initialize_index(self):
        """Initialize the appropriate Faiss index based on configuration"""
        
        # Choose distance metric
        if self.metric == "cosine":
            # For cosine similarity, we'll normalize vectors and use inner product
            metric_type = faiss.METRIC_INNER_PRODUCT
            logger.info("Using cosine similarity (normalized inner product)")
        elif self.metric == "l2":
            metric_type = faiss.METRIC_L2
            logger.info("Using L2 (Euclidean) distance")
        elif self.metric == "ip":
            metric_type = faiss.METRIC_INNER_PRODUCT
            logger.info("Using inner product")
        else:
            raise ValueError(f"Unsupported metric: {self.metric}")
        
        # Create index based on type
        if self.index_type == "FLAT":
            # Exact search - good for small datasets
            self.dense_index = faiss.IndexFlatIP(self.embedding_dimension) if metric_type == faiss.METRIC_INNER_PRODUCT else faiss.IndexFlatL2(self.embedding_dimension)
            logger.info("Created FLAT index (exact search)")
            
        elif self.index_type == "IVF":
            # Approximate search with clustering - optimized for 1024D embeddings
            quantizer = faiss.IndexFlatIP(self.embedding_dimension) if metric_type == faiss.METRIC_INNER_PRODUCT else faiss.IndexFlatL2(self.embedding_dimension)
            # Optimize nlist for 1024-dimensional vectors and extended context retrieval
            optimized_nlist = max(self.nlist, int(np.sqrt(self.embedding_dimension)) * 2)
            self.dense_index = faiss.IndexIVFFlat(quantizer, self.embedding_dimension, optimized_nlist, metric_type)
            # Set better search parameters for extended context scenarios
            self.dense_index.nprobe = min(optimized_nlist // 4, 32)  # Search more clusters for better recall
            logger.info(f"Created optimized IVF index with {optimized_nlist} clusters, nprobe={self.dense_index.nprobe}")
            
        elif self.index_type == "HNSW":
            # Hierarchical NSW - optimized for large datasets and extended context
            # Optimize M parameter for 1024D vectors (higher M for better connectivity)
            M = min(64, max(32, self.embedding_dimension // 16))
            self.dense_index = faiss.IndexHNSWFlat(self.embedding_dimension, M, metric_type)
            # Optimize construction and search parameters for better recall with 10K context
            self.dense_index.hnsw.efConstruction = min(400, max(200, self.embedding_dimension // 3))
            self.dense_index.hnsw.efSearch = min(200, max(100, self.embedding_dimension // 8))
            logger.info(f"Created optimized HNSW index (M={M}, efConstruction={self.dense_index.hnsw.efConstruction}, efSearch={self.dense_index.hnsw.efSearch})")
            
        else:
            raise ValueError(f"Unsupported index type: {self.index_type}")
        
        # GPU acceleration if requested and available
        if self.use_gpu and faiss.get_num_gpus() > 0:
            try:
                res = faiss.StandardGpuResources()
                self.dense_index = faiss.index_cpu_to_gpu(res, 0, self.dense_index)
                logger.info("✅ GPU acceleration enabled")
            except Exception as e:
                logger.warning(f"Failed to enable GPU acceleration: {e}")
                logger.info("Falling back to CPU")
        else:
            logger.info("Using CPU for vector operations")
    
    def _normalize_vectors(self, vectors: np.ndarray) -> np.ndarray:
        """Normalize vectors for cosine similarity"""
        if self.metric == "cosine":
            norms = np.linalg.norm(vectors, axis=1, keepdims=True)
            # Avoid division by zero
            norms = np.where(norms == 0, 1, norms)
            return vectors / norms
        return vectors
    
    def add_embeddings(self, embedding_results: List[EmbeddingResult]) -> bool:
        """
        Add embedding results to the vector database
        
        Args:
            embedding_results: List of EmbeddingResult objects
            
        Returns:
            True if successful
        """
        if not embedding_results:
            logger.warning("No embeddings to add")
            return False
        
        logger.info(f"Adding {len(embedding_results)} embeddings to database")
        
        # Validate embedding dimensions
        first_dim = len(embedding_results[0].dense_embedding)
        if first_dim != self.embedding_dimension:
            raise ValueError(f"Embedding dimension mismatch! Expected {self.embedding_dimension}, got {first_dim}")
        
        # Prepare dense embeddings
        dense_vectors = np.array([result.dense_embedding for result in embedding_results], dtype=np.float32)
        
        # Validate all embeddings have correct dimension
        for i, result in enumerate(embedding_results):
            if len(result.dense_embedding) != self.embedding_dimension:
                raise ValueError(f"Embedding {i} has dimension {len(result.dense_embedding)}, expected {self.embedding_dimension}")
        
        logger.info(f"Dense vectors shape: {dense_vectors.shape}")
        
        # Normalize for cosine similarity
        dense_vectors = self._normalize_vectors(dense_vectors)
        
        # Prepare sparse embeddings
        sparse_embeddings = []
        for result in embedding_results:
            if result.sparse_embedding is not None:
                sparse_embeddings.append(result.sparse_embedding)
        
        if sparse_embeddings:
            self.sparse_embeddings = sp.vstack(sparse_embeddings) if self.sparse_embeddings is None else sp.vstack([self.sparse_embeddings] + sparse_embeddings)
            self.sparse_chunk_ids.extend([result.chunk_id for result in embedding_results])
        
        # Add metadata and ID mappings
        for result in embedding_results:
            internal_id = self.next_id
            chunk_id = result.chunk_id
            
            self.id_to_chunk_id[internal_id] = chunk_id
            self.chunk_id_to_id[chunk_id] = internal_id
            self.chunk_metadata[chunk_id] = result.metadata
            
            self.next_id += 1
        
        # Train index if needed (for IVF) or auto-switch for small datasets
        if self.index_type == "IVF" and not self.is_trained:
            # For small datasets (< 1000 vectors), always use FLAT for better accuracy
            if len(dense_vectors) < 1000:
                logger.warning(f"Small dataset ({len(dense_vectors)} vectors) detected. Auto-switching to FLAT index for better accuracy.")
                metric_type = faiss.METRIC_INNER_PRODUCT if self.metric in ["cosine", "ip"] else faiss.METRIC_L2
                self.dense_index = faiss.IndexFlatIP(self.embedding_dimension) if metric_type == faiss.METRIC_INNER_PRODUCT else faiss.IndexFlatL2(self.embedding_dimension)
                self.index_type = "FLAT"  # Update the type for consistency
                self.is_trained = True  # FLAT doesn't need training
            elif len(dense_vectors) < self.nlist:
                logger.warning(f"Not enough vectors ({len(dense_vectors)}) to train IVF index (needs >= {self.nlist})")
                logger.info("Switching to FLAT index for now")
                # Temporarily use flat index
                metric_type = faiss.METRIC_INNER_PRODUCT if self.metric in ["cosine", "ip"] else faiss.METRIC_L2
                self.dense_index = faiss.IndexFlatIP(self.embedding_dimension) if metric_type == faiss.METRIC_INNER_PRODUCT else faiss.IndexFlatL2(self.embedding_dimension)
            else:
                logger.info("Training IVF index...")
                self.dense_index.train(dense_vectors)
                self.is_trained = True
                logger.info("✅ IVF index trained")
        
        # Add vectors to index
        self.dense_index.add(dense_vectors)
        self.total_vectors += len(dense_vectors)
        
        logger.info(f"✅ Added {len(embedding_results)} embeddings to database")
        logger.info(f"Total vectors in database: {self.total_vectors}")
        
        return True
    
    def search_dense(self, query_embedding: List[float], k: int = 10) -> List[SearchResult]:
        """
        Search using dense embeddings only
        
        Args:
            query_embedding: Query embedding vector
            k: Number of results to return
            
        Returns:
            List of SearchResult objects
        """
        if self.total_vectors == 0:
            logger.warning("Database is empty")
            return []
        
        # Validate query dimension
        if len(query_embedding) != self.embedding_dimension:
            raise ValueError(f"Query embedding dimension {len(query_embedding)} doesn't match database dimension {self.embedding_dimension}")
        
        # Prepare query vector
        query_vector = np.array([query_embedding], dtype=np.float32)
        query_vector = self._normalize_vectors(query_vector)
        
        # Search
        scores, indices = self.dense_index.search(query_vector, min(k, self.total_vectors))
        
        # Convert results
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx == -1:  # Faiss returns -1 for invalid results
                continue
                
            chunk_id = self.id_to_chunk_id[idx]
            metadata = self.chunk_metadata.get(chunk_id, {})
            
            result = SearchResult(
                chunk_id=chunk_id,
                score=float(score),
                dense_score=float(score),
                metadata=metadata
            )
            results.append(result)
        
        logger.debug(f"Dense search returned {len(results)} results")
        return results
    
    def search_sparse(self, query_embedding: sp.csr_matrix, k: int = 10) -> List[SearchResult]:
        """
        Search using sparse embeddings only
        
        Args:
            query_embedding: Query sparse embedding
            k: Number of results to return
            
        Returns:
            List of SearchResult objects
        """
        if self.sparse_embeddings is None:
            logger.warning("No sparse embeddings in database")
            return []
        
        # Compute cosine similarity
        from sklearn.metrics.pairwise import cosine_similarity
        similarities = cosine_similarity(query_embedding, self.sparse_embeddings)[0]
        
        # Get top k results
        top_indices = np.argsort(similarities)[::-1][:k]
        
        results = []
        for idx in top_indices:
            if idx < len(self.sparse_chunk_ids):
                chunk_id = self.sparse_chunk_ids[idx]
                score = similarities[idx]
                metadata = self.chunk_metadata.get(chunk_id, {})
                
                result = SearchResult(
                    chunk_id=chunk_id,
                    score=float(score),
                    dense_score=0.0,  # No dense score in sparse-only search
                    sparse_score=float(score),
                    metadata=metadata
                )
                results.append(result)
        
        logger.debug(f"Sparse search returned {len(results)} results")
        return results
    
    def search_hybrid(self, query_text: str, embedding_engine: EmbeddingEngine, 
                     k: int = 10, dense_weight: float = 0.7, sparse_weight: float = 0.3) -> List[SearchResult]:
        """
        Hybrid search combining dense and sparse results
        
        Args:
            query_text: Query text
            embedding_engine: EmbeddingEngine instance for generating embeddings
            k: Number of results to return
            dense_weight: Weight for dense similarity
            sparse_weight: Weight for sparse similarity
            
        Returns:
            List of SearchResult objects sorted by hybrid score
        """
        logger.info(f"Performing hybrid search for: {query_text[:50]}...")
        
        # Get query embeddings
        query_dense = embedding_engine.get_dense_embedding(query_text)
        query_sparse = embedding_engine.get_sparse_embedding(query_text)
        
        # Perform both searches
        dense_results = self.search_dense(query_dense, k * 2)  # Get more for better hybrid ranking
        sparse_results = self.search_sparse(query_sparse, k * 2)
        
        # Combine results by chunk_id
        combined_scores = {}
        
        # Add dense scores
        for result in dense_results:
            combined_scores[result.chunk_id] = {
                'dense_score': result.dense_score,
                'sparse_score': 0.0,
                'metadata': result.metadata
            }
        
        # Add sparse scores
        for result in sparse_results:
            if result.chunk_id in combined_scores:
                combined_scores[result.chunk_id]['sparse_score'] = result.sparse_score
            else:
                combined_scores[result.chunk_id] = {
                    'dense_score': 0.0,
                    'sparse_score': result.sparse_score,
                    'metadata': result.metadata
                }
        
        # Calculate hybrid scores
        hybrid_results = []
        for chunk_id, scores in combined_scores.items():
            hybrid_score = (dense_weight * scores['dense_score']) + (sparse_weight * scores['sparse_score'])
            
            result = SearchResult(
                chunk_id=chunk_id,
                score=hybrid_score,
                dense_score=scores['dense_score'],
                sparse_score=scores['sparse_score'],
                hybrid_score=hybrid_score,
                metadata=scores['metadata']
            )
            hybrid_results.append(result)
        
        # Sort by hybrid score
        hybrid_results.sort(key=lambda x: x.hybrid_score, reverse=True)
        
        logger.info(f"Hybrid search returned {len(hybrid_results[:k])} results")
        return hybrid_results[:k]
    
    def get_stats(self) -> Dict[str, Any]:
        """Get database statistics"""
        stats = {
            "total_vectors": self.total_vectors,
            "embedding_dimension": self.embedding_dimension,
            "index_type": self.index_type,
            "metric": self.metric,
            "is_trained": self.is_trained,
            "gpu_enabled": self.use_gpu and faiss.get_num_gpus() > 0,
            "sparse_vectors": self.sparse_embeddings.shape[0] if self.sparse_embeddings is not None else 0,
            "sparse_features": self.sparse_embeddings.shape[1] if self.sparse_embeddings is not None else 0
        }
        return stats
    
    def save_database(self, output_dir: str):
        """Save the vector database to disk"""
        os.makedirs(output_dir, exist_ok=True)
        
        # Save Faiss index
        faiss_file = os.path.join(output_dir, "faiss_index.bin")
        if self.use_gpu and faiss.get_num_gpus() > 0:
            # Move to CPU before saving
            cpu_index = faiss.index_gpu_to_cpu(self.dense_index)
            faiss.write_index(cpu_index, faiss_file)
        else:
            faiss.write_index(self.dense_index, faiss_file)
        
        # Save metadata and mappings
        metadata_file = os.path.join(output_dir, "database_metadata.pkl")
        metadata = {
            "embedding_dimension": self.embedding_dimension,
            "index_type": self.index_type,
            "metric": self.metric,
            "nlist": self.nlist,
            "chunk_metadata": self.chunk_metadata,
            "id_to_chunk_id": self.id_to_chunk_id,
            "chunk_id_to_id": self.chunk_id_to_id,
            "next_id": self.next_id,
            "is_trained": self.is_trained,
            "total_vectors": self.total_vectors,
            "sparse_chunk_ids": self.sparse_chunk_ids
        }
        
        with open(metadata_file, 'wb') as f:
            pickle.dump(metadata, f)
        
        # Save sparse embeddings
        if self.sparse_embeddings is not None:
            sparse_file = os.path.join(output_dir, "sparse_embeddings.npz")
            sp.save_npz(sparse_file, self.sparse_embeddings)
        
        # Save configuration as JSON for easy inspection
        config_file = os.path.join(output_dir, "database_config.json")
        config = {
            "embedding_dimension": self.embedding_dimension,
            "index_type": self.index_type,
            "metric": self.metric,
            "nlist": self.nlist,
            "total_vectors": self.total_vectors,
            "is_trained": self.is_trained,
            "timestamp": time.time()
        }
        
        with open(config_file, 'w') as f:
            json.dump(config, f, indent=2)
        
        logger.info(f"✅ Database saved to {output_dir}")
        logger.info(f"  - Faiss index: {faiss_file}")
        logger.info(f"  - Metadata: {metadata_file}")
        logger.info(f"  - Config: {config_file}")
    
    def load_database(self, input_dir: str):
        """Load the vector database from disk"""
        
        # Load configuration
        config_file = os.path.join(input_dir, "database_config.json")
        if os.path.exists(config_file):
            with open(config_file, 'r') as f:
                config = json.load(f)
            logger.info(f"Loading database with config: {config}")
        
        # Load Faiss index
        faiss_file = os.path.join(input_dir, "faiss_index.bin")
        if not os.path.exists(faiss_file):
            raise FileNotFoundError(f"Faiss index not found: {faiss_file}")
        
        self.dense_index = faiss.read_index(faiss_file)
        
        # GPU acceleration if requested
        if self.use_gpu and faiss.get_num_gpus() > 0:
            try:
                res = faiss.StandardGpuResources()
                self.dense_index = faiss.index_cpu_to_gpu(res, 0, self.dense_index)
                logger.info("✅ GPU acceleration enabled for loaded index")
            except Exception as e:
                logger.warning(f"Failed to enable GPU acceleration: {e}")
        
        # Load metadata
        metadata_file = os.path.join(input_dir, "database_metadata.pkl")
        with open(metadata_file, 'rb') as f:
            metadata = pickle.load(f)
        
        self.embedding_dimension = metadata["embedding_dimension"]
        self.index_type = metadata["index_type"]
        self.metric = metadata["metric"]
        self.nlist = metadata["nlist"]
        self.chunk_metadata = metadata["chunk_metadata"]
        self.id_to_chunk_id = metadata["id_to_chunk_id"]
        self.chunk_id_to_id = metadata["chunk_id_to_id"]
        self.next_id = metadata["next_id"]
        self.is_trained = metadata["is_trained"]
        self.total_vectors = metadata["total_vectors"]
        self.sparse_chunk_ids = metadata["sparse_chunk_ids"]
        
        # Load sparse embeddings
        sparse_file = os.path.join(input_dir, "sparse_embeddings.npz")
        if os.path.exists(sparse_file):
            self.sparse_embeddings = sp.load_npz(sparse_file)
        
        logger.info(f"✅ Database loaded from {input_dir}")
        logger.info(f"  - Total vectors: {self.total_vectors}")
        logger.info(f"  - Embedding dimension: {self.embedding_dimension}")


def main():
    """Example usage of the Faiss vector database"""
    from embedding_engine import EmbeddingEngine
    from document_processor import DocumentProcessor
    
    # Initialize components
    processor = DocumentProcessor()
    embedding_engine = EmbeddingEngine(ollama_model="dengcao/Qwen3-Embedding-0.6B:F16")
    
    # Load a few chunks for testing
    chunk_file = "processed_chunks/semantic_chunks.json"
    chunks = processor.load_chunks(chunk_file)
    sample_chunks = chunks[:20]  # Use 20 chunks for testing
    
    # Generate embeddings
    logger.info("Generating embeddings...")
    embedding_results = embedding_engine.embed_chunks(sample_chunks)
    
    # Get the correct embedding dimension from the first result
    embedding_dim = len(embedding_results[0].dense_embedding)
    logger.info(f"Detected embedding dimension: {embedding_dim}")
    
    # Initialize vector database with correct dimension
    vector_db = FaissVectorDatabase(
        embedding_dimension=embedding_dim,
        index_type="IVF",
        nlist=10,  # Small nlist for testing
        metric="cosine"
    )
    
    # Add embeddings to database
    vector_db.add_embeddings(embedding_results)
    
    # Test searches
    query = "How to create a ticket in workspace?"
    
    print("\n=== Dense Search ===")
    query_dense = embedding_engine.get_dense_embedding(query)
    dense_results = vector_db.search_dense(query_dense, k=5)
    for i, result in enumerate(dense_results):
        print(f"{i+1}. Score: {result.score:.4f} | Chunk: {result.chunk_id}")
    
    print("\n=== Hybrid Search ===")
    hybrid_results = vector_db.search_hybrid(query, embedding_engine, k=5)
    for i, result in enumerate(hybrid_results):
        print(f"{i+1}. Hybrid: {result.hybrid_score:.4f} | Dense: {result.dense_score:.4f} | Sparse: {result.sparse_score:.4f}")
        print(f"   Chunk: {result.chunk_id}")
    
    # Save database
    vector_db.save_database("vector_database")
    
    # Show stats
    stats = vector_db.get_stats()
    print(f"\n=== Database Stats ===")
    for key, value in stats.items():
        print(f"{key}: {value}")


if __name__ == "__main__":
    main() 