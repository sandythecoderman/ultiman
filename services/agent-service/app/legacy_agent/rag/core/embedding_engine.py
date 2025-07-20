"""
Multi-Stage Embedding Engine for RAG System
Implements dense embeddings (SentenceTransformers all-mpnet-base-v2) + sparse embeddings (TF-IDF/BM25)
"""

import os
import json
import pickle
import logging
import hashlib
import numpy as np
from typing import List, Dict, Any, Optional, Union, Tuple
from dataclasses import dataclass, asdict
from pathlib import Path
import time

from sentence_transformers import SentenceTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import scipy.sparse as sp

from .document_processor import DocumentChunk

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class EmbeddingResult:
    """Represents embedding results for a document chunk"""
    chunk_id: str
    dense_embedding: List[float]
    sparse_embedding: Optional[sp.csr_matrix] = None
    embedding_model: str = ""
    embedding_timestamp: float = 0.0
    embedding_dimension: int = 0
    metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}
        if self.embedding_timestamp == 0.0:
            self.embedding_timestamp = time.time()

class EmbeddingEngine:
    """Multi-stage embedding engine with dense + sparse embeddings"""
    
    def __init__(self, 
                 model_name: str = "all-mpnet-base-v2",
                 max_retries: int = 3,
                 retry_delay: float = 1.0,
                 batch_size: int = 10,
                 device: str = None):
        """
        Initialize the embedding engine with SentenceTransformers
        
        Args:
            model_name: Name of the SentenceTransformer model
            max_retries: Maximum number of retries for API calls
            retry_delay: Delay between retries in seconds
            batch_size: Number of chunks to process in each batch
            device: Device to use (None for auto-detection, 'cuda', 'cpu')
        """
        self.model_name = model_name
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.batch_size = batch_size
        
        # Auto-detect device if not specified
        if device is None:
            import torch
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = device
        
        # Initialize SentenceTransformer model
        logger.info(f"Loading SentenceTransformer model: {model_name}")
        logger.info(f"Using device: {self.device}")
        self.sentence_model = SentenceTransformer(model_name, device=self.device)
        self.embedding_dimension = self.sentence_model.get_sentence_embedding_dimension()
        
        # Initialize sparse embedding components
        self.tfidf_vectorizer = None
        self.is_fitted = False
        
        # Cache for embeddings
        self.embedding_cache = {}
        
        logger.info(f"✅ EmbeddingEngine initialized with model: {model_name}")
        logger.info(f"   Embedding dimension: {self.embedding_dimension}")
        logger.info(f"   Device: {self.sentence_model.device}")
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the loaded model"""
        return {
            "model_name": self.model_name,
            "embedding_dimension": self.embedding_dimension,
            "device": str(self.sentence_model.device),
            "max_seq_length": getattr(self.sentence_model, 'max_seq_length', 'Unknown')
        }
    
    def _get_cache_key(self, text: str, model: str) -> str:
        """Generate cache key for embedding"""
        content_hash = hashlib.md5(f"{text}_{model}".encode()).hexdigest()
        return content_hash
    
    def get_dense_embedding(self, text: str, use_cache: bool = True) -> List[float]:
        """
        Get dense embedding using SentenceTransformers model
        
        Args:
            text: Text to embed
            use_cache: Whether to use cached embeddings
            
        Returns:
            Dense embedding vector as list of floats
        """
        cache_key = self._get_cache_key(text, self.model_name)
        
        if use_cache and cache_key in self.embedding_cache:
            logger.debug(f"Using cached embedding for text: {text[:50]}...")
            return self.embedding_cache[cache_key]
        
        for attempt in range(self.max_retries):
            try:
                logger.debug(f"Getting embedding for text: {text[:50]}... (attempt {attempt + 1})")
                
                # Get embedding using SentenceTransformers
                embedding_array = self.sentence_model.encode(
                    text,
                    convert_to_tensor=False,  # Return numpy array
                    normalize_embeddings=True  # Normalize for better cosine similarity
                )
                
                # Convert to list for JSON serialization
                embedding = embedding_array.tolist()
                
                # Cache the result
                if use_cache:
                    self.embedding_cache[cache_key] = embedding
                
                logger.debug(f"Successfully embedded text, dimension: {len(embedding)}")
                return embedding
                
            except Exception as e:
                logger.warning(f"Embedding attempt {attempt + 1} failed: {e}")
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_delay * (2 ** attempt))  # Exponential backoff
                else:
                    logger.error(f"Failed to get embedding after {self.max_retries} attempts")
                    raise
    
    def get_dense_embeddings_batch(self, texts: List[str], use_cache: bool = True) -> List[List[float]]:
        """
        Get dense embeddings for multiple texts in batch
        
        Args:
            texts: List of texts to embed
            use_cache: Whether to use cached embeddings
            
        Returns:
            List of dense embedding vectors
        """
        embeddings = []
        
        # Process in batches to avoid overwhelming the server
        for i in range(0, len(texts), self.batch_size):
            batch_texts = texts[i:i + self.batch_size]
            batch_embeddings = []
            
            for text in batch_texts:
                embedding = self.get_dense_embedding(text, use_cache)
                batch_embeddings.append(embedding)
            
            embeddings.extend(batch_embeddings)
            
            if len(batch_texts) == self.batch_size:
                logger.info(f"Processed batch {i//self.batch_size + 1}, total: {len(embeddings)}/{len(texts)}")
        
        return embeddings
    
    def fit_sparse_embeddings(self, texts: List[str]):
        """
        Fit TF-IDF vectorizer on the corpus
        
        Args:
            texts: List of texts to fit the vectorizer on
        """
        logger.info(f"Fitting TF-IDF vectorizer on {len(texts)} documents")
        
        # Initialize TF-IDF vectorizer with optimized parameters
        # Adjust parameters based on corpus size
        min_df = min(2, max(1, len(texts) // 10))  # Dynamic min_df
        max_df = 0.95 if len(texts) > 10 else 1.0  # No max_df for small corpora
        
        self.tfidf_vectorizer = TfidfVectorizer(
            max_features=min(10000, len(texts) * 100),  # Limit vocabulary size based on corpus
            min_df=min_df,          # Dynamic min_df
            max_df=max_df,          # Dynamic max_df
            stop_words='english',   # Remove English stop words
            ngram_range=(1, 2),     # Use unigrams and bigrams
            sublinear_tf=True,      # Apply sublinear tf scaling
            norm='l2',              # L2 normalization
            lowercase=True,         # Convert to lowercase
            strip_accents='unicode' # Remove accents
        )
        
        # Fit the vectorizer
        self.tfidf_vectorizer.fit(texts)
        self.is_fitted = True
        
        vocab_size = len(self.tfidf_vectorizer.vocabulary_)
        logger.info(f"✅ TF-IDF vectorizer fitted with vocabulary size: {vocab_size}")
    
    def get_sparse_embedding(self, text: str) -> sp.csr_matrix:
        """
        Get sparse embedding using TF-IDF
        
        Args:
            text: Text to embed
            
        Returns:
            Sparse TF-IDF vector
        """
        if not self.is_fitted:
            raise ValueError("TF-IDF vectorizer is not fitted. Call fit_sparse_embeddings() first.")
        
        sparse_vector = self.tfidf_vectorizer.transform([text])
        return sparse_vector
    
    def get_sparse_embeddings_batch(self, texts: List[str]) -> sp.csr_matrix:
        """
        Get sparse embeddings for multiple texts
        
        Args:
            texts: List of texts to embed
            
        Returns:
            Sparse matrix of TF-IDF vectors
        """
        if not self.is_fitted:
            raise ValueError("TF-IDF vectorizer is not fitted. Call fit_sparse_embeddings() first.")
        
        sparse_matrix = self.tfidf_vectorizer.transform(texts)
        logger.info(f"Generated sparse embeddings: {sparse_matrix.shape}")
        return sparse_matrix
    
    def embed_chunks(self, chunks: List[DocumentChunk]) -> List[EmbeddingResult]:
        """
        Generate embeddings for document chunks using both dense and sparse methods
        
        Args:
            chunks: List of DocumentChunk objects
            
        Returns:
            List of EmbeddingResult objects
        """
        logger.info(f"Embedding {len(chunks)} chunks with multi-stage strategy")
        
        # Extract texts
        texts = [chunk.content for chunk in chunks]
        
        # First, fit sparse embeddings on the corpus
        logger.info("Step 1: Fitting sparse embeddings (TF-IDF)")
        self.fit_sparse_embeddings(texts)
        
        # Generate sparse embeddings
        logger.info("Step 2: Generating sparse embeddings")
        sparse_embeddings = self.get_sparse_embeddings_batch(texts)
        
        # Generate dense embeddings
        logger.info("Step 3: Generating dense embeddings with Ollama")
        dense_embeddings = self.get_dense_embeddings_batch(texts)
        
        # Create embedding results
        logger.info("Step 4: Creating embedding results")
        results = []
        
        for i, (chunk, dense_emb) in enumerate(zip(chunks, dense_embeddings)):
            sparse_emb = sparse_embeddings[i]
            
            result = EmbeddingResult(
                chunk_id=chunk.chunk_id,
                dense_embedding=dense_emb,
                sparse_embedding=sparse_emb,
                embedding_model=self.model_name,
                embedding_dimension=len(dense_emb),
                metadata={
                    "chunk_type": chunk.chunk_type,
                    "chunk_index": chunk.chunk_index,
                    "token_count": chunk.token_count,
                    "character_count": chunk.character_count,
                    "source_file": chunk.source_file,
                    "sparse_nnz": sparse_emb.nnz,  # Number of non-zero elements
                    "sparse_density": sparse_emb.nnz / sparse_emb.shape[1] if sparse_emb.shape[1] > 0 else 0
                }
            )
            results.append(result)
        
        logger.info(f"✅ Successfully embedded {len(results)} chunks")
        return results
    
    def compute_dense_similarity(self, query_embedding: List[float], 
                                chunk_embeddings: List[List[float]]) -> List[float]:
        """
        Compute cosine similarity between query and chunk embeddings (dense)
        
        Args:
            query_embedding: Query embedding vector
            chunk_embeddings: List of chunk embedding vectors
            
        Returns:
            List of similarity scores
        """
        query_array = np.array(query_embedding).reshape(1, -1)
        chunk_array = np.array(chunk_embeddings)
        
        similarities = cosine_similarity(query_array, chunk_array)[0]
        return similarities.tolist()
    
    def compute_sparse_similarity(self, query_embedding: sp.csr_matrix,
                                 chunk_embeddings: sp.csr_matrix) -> List[float]:
        """
        Compute cosine similarity between query and chunk embeddings (sparse)
        
        Args:
            query_embedding: Query sparse embedding
            chunk_embeddings: Chunk sparse embeddings matrix
            
        Returns:
            List of similarity scores
        """
        similarities = cosine_similarity(query_embedding, chunk_embeddings)[0]
        return similarities.tolist()
    
    def hybrid_similarity(self, query_text: str, embedding_results: List[EmbeddingResult],
                         dense_weight: float = 0.7, sparse_weight: float = 0.3) -> List[Tuple[str, float]]:
        """
        Compute hybrid similarity combining dense and sparse embeddings
        
        Args:
            query_text: Query text
            embedding_results: List of EmbeddingResult objects
            dense_weight: Weight for dense similarity
            sparse_weight: Weight for sparse similarity
            
        Returns:
            List of (chunk_id, hybrid_score) tuples sorted by score
        """
        logger.info(f"Computing hybrid similarity for query: {query_text[:50]}...")
        
        # Get query embeddings
        query_dense = self.get_dense_embedding(query_text)
        query_sparse = self.get_sparse_embedding(query_text)
        
        # Extract embeddings from results
        chunk_dense_embeddings = [result.dense_embedding for result in embedding_results]
        chunk_sparse_embeddings = sp.vstack([result.sparse_embedding for result in embedding_results])
        
        # Compute similarities
        dense_similarities = self.compute_dense_similarity(query_dense, chunk_dense_embeddings)
        sparse_similarities = self.compute_sparse_similarity(query_sparse, chunk_sparse_embeddings)
        
        # Compute hybrid scores
        hybrid_scores = []
        for i, result in enumerate(embedding_results):
            dense_sim = dense_similarities[i]
            sparse_sim = sparse_similarities[i]
            hybrid_score = (dense_weight * dense_sim) + (sparse_weight * sparse_sim)
            hybrid_scores.append((result.chunk_id, hybrid_score))
        
        # Sort by score descending
        hybrid_scores.sort(key=lambda x: x[1], reverse=True)
        
        logger.info(f"Computed hybrid similarity for {len(hybrid_scores)} chunks")
        return hybrid_scores
    
    def save_embeddings(self, embedding_results: List[EmbeddingResult], output_file: str):
        """
        Save embedding results to file
        
        Args:
            embedding_results: List of EmbeddingResult objects
            output_file: Path to output file
        """
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        
        # Prepare data for serialization
        data = {
            "model_info": {
                "model_name": self.model_name,
                "device": self.device,
                "embedding_dimension": self.embedding_dimension,
                "tfidf_vocab_size": len(self.tfidf_vectorizer.vocabulary_) if self.is_fitted else 0,
                "embedding_count": len(embedding_results),
                "timestamp": time.time()
            },
            "embeddings": []
        }
        
        for result in embedding_results:
            embedding_data = {
                "chunk_id": result.chunk_id,
                "dense_embedding": result.dense_embedding,
                "embedding_model": result.embedding_model,
                "embedding_timestamp": result.embedding_timestamp,
                "embedding_dimension": result.embedding_dimension,
                "metadata": result.metadata
            }
            data["embeddings"].append(embedding_data)
        
        # Save dense embeddings and metadata as JSON
        with open(output_file.replace('.pkl', '.json'), 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        # Save complete data (including sparse embeddings) as pickle
        with open(output_file, 'wb') as f:
            pickle.dump({
                "model_info": data["model_info"],
                "embedding_results": embedding_results,
                "tfidf_vectorizer": self.tfidf_vectorizer
            }, f)
        
        logger.info(f"Saved {len(embedding_results)} embeddings to {output_file}")
    
    def load_embeddings(self, input_file: str) -> List[EmbeddingResult]:
        """
        Load embedding results from file
        
        Args:
            input_file: Path to input file
            
        Returns:
            List of EmbeddingResult objects
        """
        with open(input_file, 'rb') as f:
            data = pickle.load(f)
        
        self.tfidf_vectorizer = data["tfidf_vectorizer"]
        self.is_fitted = True
        
        embedding_results = data["embedding_results"]
        
        logger.info(f"Loaded {len(embedding_results)} embeddings from {input_file}")
        return embedding_results


def main():
    """Example usage of the embedding engine"""
    try:
        from core.document_processor import DocumentProcessor
    except ImportError:
        from document_processor import DocumentProcessor
    
    # Initialize components
    processor = DocumentProcessor()
    embedding_engine = EmbeddingEngine(
        model_name="all-mpnet-base-v2",
        batch_size=5  # Smaller batch for testing
    )
    
    # Load processed chunks
    chunk_file = "src/knowledgeBase/agent/rag/processed_chunks/semantic_chunks.json"
    
    try:
        chunks = processor.load_chunks(chunk_file)
        logger.info(f"Loaded {len(chunks)} chunks for embedding")
        
        # Take a smaller sample for testing
        sample_chunks = chunks[:50]  # First 50 chunks
        logger.info(f"Using sample of {len(sample_chunks)} chunks for embedding test")
        
        # Generate embeddings
        embedding_results = embedding_engine.embed_chunks(sample_chunks)
        
        # Save embeddings
        output_file = "src/knowledgeBase/agent/rag/embeddings/semantic_embeddings.pkl"
        embedding_engine.save_embeddings(embedding_results, output_file)
        
        # Test hybrid similarity
        query = "How to create a ticket in workspace?"
        similarities = embedding_engine.hybrid_similarity(query, embedding_results)
        
        print("\n=== Embedding Results ===")
        print(f"Embedded {len(embedding_results)} chunks")
        print(f"Dense embedding dimension: {embedding_results[0].embedding_dimension}")
        print(f"Sparse embedding vocabulary: {len(embedding_engine.tfidf_vectorizer.vocabulary_)}")
        
        print(f"\n=== Top 5 Similar Chunks for Query: '{query}' ===")
        for i, (chunk_id, score) in enumerate(similarities[:5]):
            chunk = next(c for c in sample_chunks if c.chunk_id == chunk_id)
            print(f"{i+1}. Score: {score:.4f} | {chunk.content[:100]}...")
        
    except Exception as e:
        logger.error(f"Error in embedding pipeline: {e}")
        raise


if __name__ == "__main__":
    main() 