"""
Multi-Stage Retrieval System for RAG Pipeline

Implements the retrieval and reranking layer from RAG_ARCHITECTURE.md:
Initial Retrieval → Cross-Encoder Reranking → Context Selection → Context Fusion

Features:
- Keyword search (sparse embeddings/BM25)
- Semantic search (dense embeddings)
- Hybrid scoring combination
- Cross-encoder reranking
- Context window optimization
- Diversity injection
"""

import json
import logging
import numpy as np
from typing import List, Dict, Any, Optional, Tuple, Set
from dataclasses import dataclass, asdict
from pathlib import Path
import pickle
import asyncio
from datetime import datetime

# External imports
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import faiss
from sentence_transformers import CrossEncoder

# Local imports
from .vector_database import FaissVectorDatabase
from .query_processor import QueryProcessor, ProcessedQuery
from .embedding_engine import EmbeddingEngine

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class RetrievalResult:
    """Container for retrieval results"""
    chunk_id: str
    content: str
    metadata: Dict[str, Any]
    dense_score: float
    sparse_score: float
    hybrid_score: float
    rerank_score: Optional[float] = None
    final_score: Optional[float] = None
    rank_position: int = 0

@dataclass
class RetrievalResponse:
    """Complete retrieval response"""
    query: str
    results: List[RetrievalResult]
    retrieval_metadata: Dict[str, Any]
    fused_context: str
    processing_time_ms: float

class MultiStageRetriever:
    """
    Multi-stage retrieval system implementing the RAG architecture
    """
    
    def __init__(self, 
                 vector_db_path: str = "src/knowledgeBase/agent/rag/storage/vector_storage/",
                 processed_chunks_path: str = "src/knowledgeBase/agent/rag/storage/processed_chunks/",
                 dense_weight: float = 0.7,
                 sparse_weight: float = 0.3,
                 max_initial_results: int = 50,
                 max_reranked_results: int = 10,
                 max_final_results: int = 5,
                 context_window_size: int = 10000,
                 skip_initialization: bool = False):
        """
        Initialize multi-stage retriever
        
        Args:
            vector_db_path: Path to vector database storage
            processed_chunks_path: Path to processed chunks
            dense_weight: Weight for dense embedding scores
            sparse_weight: Weight for sparse embedding scores
            max_initial_results: Maximum results from initial retrieval
            max_reranked_results: Maximum results after reranking
            max_final_results: Maximum final results to return
            context_window_size: Maximum context window size in tokens (10K for LLM)
            skip_initialization: Skip database loading for testing
        """
        self.vector_db_path = Path(vector_db_path)
        self.processed_chunks_path = Path(processed_chunks_path)
        self.dense_weight = dense_weight
        self.sparse_weight = sparse_weight
        self.max_initial_results = max_initial_results
        self.max_reranked_results = max_reranked_results
        self.max_final_results = max_final_results
        self.context_window_size = context_window_size
        
        # Initialize components
        self.vector_db = None
        self.query_processor = None
        self.embedding_engine = None
        self.chunks_metadata = {}
        self.tfidf_vectorizer = None
        self.tfidf_matrix = None
        
        # Cross-encoder for reranking
        self.cross_encoder = None
        self.cross_encoder_model = "cross-encoder/ms-marco-MiniLM-L-6-v2"
        
        # Performance tracking
        self.retrieval_stats = {
            'total_queries': 0,
            'avg_retrieval_time': 0,
            'cache_hits': 0
        }
        
        # Initialize retriever
        if not skip_initialization:
            self._initialize_retriever()
        else:
            # Basic initialization for testing
            self.vector_db = FaissVectorDatabase(embedding_dimension=768)
            self.query_processor = QueryProcessor()
            self.chunks_metadata = {}
            self.tfidf_vectorizer = None
            self.tfidf_matrix = None
            self._initialize_cross_encoder()
        
        logger.info("MultiStageRetriever initialized successfully")
    
    def _initialize_retriever(self):
        """Initialize all retrieval components"""
        try:
            # Load vector database with FLAT index for small datasets (better accuracy)
            # Note: all-mpnet-base-v2 uses 768-dimensional embeddings
            self.vector_db = FaissVectorDatabase(
                embedding_dimension=768, 
                index_type="FLAT",  # Use FLAT for datasets < 10k for better accuracy
                metric="cosine"
            )
            self.vector_db.load_database(str(self.vector_db_path))
            
            # Initialize query processor
            self.query_processor = QueryProcessor()
            
            # Initialize embedding engine for query encoding
            self.embedding_engine = EmbeddingEngine()
            
            # Load chunks metadata
            self._load_chunks_metadata()
            
            # Load TF-IDF components for sparse retrieval
            self._load_tfidf_components()
            
            # Initialize cross-encoder for reranking
            self._initialize_cross_encoder()
            
            logger.info("All retrieval components initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize retriever: {e}")
            raise
    
    def _load_chunks_metadata(self):
        """Load processed chunks metadata"""
        try:
            # Look for chunks_metadata_*.json files (correct pattern)
            metadata_files = list(self.processed_chunks_path.glob("chunks_metadata_*.json"))
            
            if not metadata_files:
                logger.warning("No chunk metadata files found")
                return
            
            # Load the most recent metadata file
            latest_metadata_file = max(metadata_files, key=lambda f: f.stat().st_mtime)
            logger.info(f"Loading metadata from {latest_metadata_file.name}")
            
            with open(latest_metadata_file, 'r', encoding='utf-8') as f:
                chunk_data = json.load(f)
                
            for chunk in chunk_data:
                chunk_id = chunk.get('chunk_id')
                if chunk_id:
                    self.chunks_metadata[chunk_id] = chunk
            
            logger.info(f"Loaded metadata for {len(self.chunks_metadata)} chunks")
            
        except Exception as e:
            logger.error(f"Failed to load chunks metadata: {e}")
            raise
    
    def _load_tfidf_components(self):
        """Load TF-IDF vectorizer and matrix for sparse retrieval"""
        try:
            tfidf_path = self.vector_db_path / "tfidf_vectorizer.pkl"
            matrix_path = self.vector_db_path / "tfidf_matrix.pkl"
            
            if tfidf_path.exists() and matrix_path.exists():
                with open(tfidf_path, 'rb') as f:
                    self.tfidf_vectorizer = pickle.load(f)
                
                with open(matrix_path, 'rb') as f:
                    self.tfidf_matrix = pickle.load(f)
                
                logger.info("TF-IDF components loaded successfully")
            else:
                logger.warning("TF-IDF components not found, will create new ones")
                self._create_tfidf_components()
                
        except Exception as e:
            logger.error(f"Failed to load TF-IDF components: {e}")
            raise
    
    def _create_tfidf_components(self):
        """Create TF-IDF components from chunks"""
        try:
            # Collect all chunk texts
            chunk_texts = []
            chunk_ids = []
            
            for chunk_id, metadata in self.chunks_metadata.items():
                chunk_texts.append(metadata.get('content', ''))
                chunk_ids.append(chunk_id)
            
            if not chunk_texts:
                logger.warning("No chunk texts found for TF-IDF creation")
                return
            
            # Create TF-IDF vectorizer
            self.tfidf_vectorizer = TfidfVectorizer(
                max_features=10000,
                stop_words='english',
                ngram_range=(1, 2),
                max_df=0.95,
                min_df=2
            )
            
            # Fit and transform
            self.tfidf_matrix = self.tfidf_vectorizer.fit_transform(chunk_texts)
            
            # Save components
            tfidf_path = self.vector_db_path / "tfidf_vectorizer.pkl"
            matrix_path = self.vector_db_path / "tfidf_matrix.pkl"
            
            with open(tfidf_path, 'wb') as f:
                pickle.dump(self.tfidf_vectorizer, f)
            
            with open(matrix_path, 'wb') as f:
                pickle.dump(self.tfidf_matrix, f)
            
            logger.info(f"Created TF-IDF components for {len(chunk_texts)} chunks")
            
        except Exception as e:
            logger.error(f"Failed to create TF-IDF components: {e}")
            raise
    
    def _initialize_cross_encoder(self):
        """Initialize cross-encoder model for reranking"""
        try:
            logger.info(f"Loading cross-encoder model: {self.cross_encoder_model}")
            self.cross_encoder = CrossEncoder(self.cross_encoder_model)
            logger.info("Cross-encoder model loaded successfully")
            
        except Exception as e:
            logger.error(f"Failed to load cross-encoder model: {e}")
            logger.warning("Falling back to simplified reranking")
            self.cross_encoder = None
    
    async def retrieve(self, query: str, **kwargs) -> RetrievalResponse:
        """
        Main retrieval method implementing multi-stage pipeline
        
        Args:
            query: User query string
            **kwargs: Additional retrieval parameters
            
        Returns:
            RetrievalResponse with ranked results and fused context
        """
        start_time = datetime.now()
        
        try:
            # Stage 1: Query Processing
            processed_query = await self.query_processor.process_query(query)
            
            # Stage 2: Initial Multi-Modal Retrieval
            initial_results = await self._initial_retrieval(processed_query, **kwargs)
            
            # Stage 3: Cross-Encoder Reranking (simplified for now)
            reranked_results = await self._rerank_results(query, initial_results)
            
            # Stage 4: Context Selection and Fusion
            final_results, fused_context = await self._context_fusion(
                query, reranked_results, processed_query
            )
            
            # Calculate processing time
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            
            # Update statistics
            self.retrieval_stats['total_queries'] += 1
            self.retrieval_stats['avg_retrieval_time'] = (
                (self.retrieval_stats['avg_retrieval_time'] * (self.retrieval_stats['total_queries'] - 1) + 
                 processing_time) / self.retrieval_stats['total_queries']
            )
            
            # Build response
            response = RetrievalResponse(
                query=query,
                results=final_results,
                retrieval_metadata={
                    'processed_query': asdict(processed_query),
                    'initial_results_count': len(initial_results),
                    'reranked_results_count': len(reranked_results),
                    'final_results_count': len(final_results),
                    'retrieval_stats': self.retrieval_stats.copy()
                },
                fused_context=fused_context,
                processing_time_ms=processing_time
            )
            
            logger.info(f"Retrieved {len(final_results)} results in {processing_time:.1f}ms")
            return response
            
        except Exception as e:
            logger.error(f"Retrieval failed: {e}")
            raise
    
    async def _initial_retrieval(self, processed_query: ProcessedQuery, **kwargs) -> List[RetrievalResult]:
        """
        Initial multi-modal retrieval combining dense and sparse search
        """
        try:
            # Get enhanced query terms
            search_terms = [processed_query.original_query]
            if processed_query.enhanced_query != processed_query.original_query:
                search_terms.append(processed_query.enhanced_query)
            
            # Dense retrieval (semantic search)
            dense_results = await self._dense_retrieval(search_terms, self.max_initial_results)
            
            # Sparse retrieval (keyword search)
            sparse_results = await self._sparse_retrieval(search_terms, self.max_initial_results)
            
            # Combine and deduplicate results
            combined_results = self._combine_retrieval_results(dense_results, sparse_results)
            
            return combined_results[:self.max_initial_results]
            
        except Exception as e:
            logger.error(f"Initial retrieval failed: {e}")
            return []
    
    async def _dense_retrieval(self, search_terms: List[str], k: int) -> List[RetrievalResult]:
        """Semantic search using dense embeddings"""
        results = []
        
        try:
            # Check if components are initialized
            if not self.embedding_engine or not self.vector_db:
                logger.error("Embedding engine or vector database not initialized")
                return results
                
            for term in search_terms:
                # Generate embedding for the search term
                query_embedding = self.embedding_engine.get_dense_embedding(term)
                
                # Search using vector database with dense embeddings
                search_results = self.vector_db.search_dense(
                    query_embedding=query_embedding,
                    k=k
                )
                
                for search_result in search_results:
                    if search_result.chunk_id in self.chunks_metadata:
                        chunk_metadata = self.chunks_metadata[search_result.chunk_id]
                        
                        result = RetrievalResult(
                            chunk_id=search_result.chunk_id,
                            content=chunk_metadata.get('content', ''),
                            metadata=chunk_metadata,
                            dense_score=search_result.score,
                            sparse_score=0.0,
                            hybrid_score=search_result.score * self.dense_weight
                        )
                        results.append(result)
            
            # Sort by dense score and deduplicate
            results = sorted(results, key=lambda x: x.dense_score, reverse=True)
            seen_chunks = set()
            unique_results = []
            
            for result in results:
                if result.chunk_id not in seen_chunks:
                    unique_results.append(result)
                    seen_chunks.add(result.chunk_id)
            
            return unique_results[:k]
            
        except Exception as e:
            logger.error(f"Dense retrieval failed: {e}")
            return []
    
    async def _sparse_retrieval(self, search_terms: List[str], k: int) -> List[RetrievalResult]:
        """Keyword search using TF-IDF"""
        results = []
        
        try:
            # Check TF-IDF components more carefully to avoid array ambiguity
            if self.tfidf_vectorizer is None or self.tfidf_matrix is None:
                logger.warning("TF-IDF components not available")
                return []
            
            # Additional check for empty/invalid matrices
            if hasattr(self.tfidf_matrix, 'shape') and self.tfidf_matrix.shape[0] == 0:
                logger.warning("TF-IDF matrix is empty")
                return []
            
            # Combine search terms
            combined_query = " ".join(search_terms)
            
            # Transform query to TF-IDF vector
            query_vector = self.tfidf_vectorizer.transform([combined_query])
            
            # Calculate similarities
            similarities = cosine_similarity(query_vector, self.tfidf_matrix).flatten()
            
            # Get top-k indices
            top_indices = np.argsort(similarities)[::-1][:k]
            
            # Convert to results
            chunk_ids = list(self.chunks_metadata.keys())
            
            for idx_pos, idx in enumerate(top_indices):
                try:
                    if int(idx) < len(chunk_ids):
                        chunk_id = chunk_ids[int(idx)]
                        score = float(similarities[int(idx)])  # Ensure both idx and score are Python types
                        # Use explicit float comparison to avoid array ambiguity
                        if score > 0.0 and chunk_id in self.chunks_metadata:
                            chunk_metadata = self.chunks_metadata[chunk_id]
                            result = RetrievalResult(
                                chunk_id=chunk_id,
                                content=chunk_metadata.get('content', ''),
                                metadata=chunk_metadata,
                                dense_score=0.0,
                                sparse_score=score,
                                hybrid_score=score * self.sparse_weight
                            )
                            results.append(result)
                except Exception as idx_error:
                    logger.debug(f"Skipping index {idx} due to error: {idx_error}")
                    continue
            
            return results
            
        except Exception as e:
            logger.error(f"Sparse retrieval failed: {e}")
            return []
    
    def _combine_retrieval_results(self, dense_results: List[RetrievalResult], 
                                 sparse_results: List[RetrievalResult]) -> List[RetrievalResult]:
        """
        Advanced hybrid scoring optimized for 10K context window
        
        Features:
        - Dynamic weight adjustment based on query characteristics
        - Score normalization for better ranking
        - Context-aware boosting factors
        """
        combined = {}
        
        # Normalize scores for better combination
        dense_scores = [r.dense_score for r in dense_results]
        sparse_scores = [r.sparse_score for r in sparse_results]
        
        # Normalize dense scores
        if dense_scores:
            max_dense = max(dense_scores) if dense_scores else 1.0
            min_dense = min(dense_scores) if dense_scores else 0.0
            dense_range = max_dense - min_dense if max_dense > min_dense else 1.0
        
        # Normalize sparse scores  
        if sparse_scores:
            max_sparse = max(sparse_scores) if sparse_scores else 1.0
            min_sparse = min(sparse_scores) if sparse_scores else 0.0
            sparse_range = max_sparse - min_sparse if max_sparse > min_sparse else 1.0
        
        # Add dense results with normalized scores
        for result in dense_results:
            if dense_scores:
                normalized_dense = (result.dense_score - min_dense) / dense_range if dense_range > 0 else result.dense_score
            else:
                normalized_dense = result.dense_score
            
            result.dense_score = normalized_dense
            combined[result.chunk_id] = result
        
        # Merge sparse results with advanced scoring
        for result in sparse_results:
            if sparse_scores:
                normalized_sparse = (result.sparse_score - min_sparse) / sparse_range if sparse_range > 0 else result.sparse_score
            else:
                normalized_sparse = result.sparse_score
            
            if result.chunk_id in combined:
                # Update existing result with normalized sparse score
                combined[result.chunk_id].sparse_score = normalized_sparse
                
                # Advanced hybrid scoring with context boosting
                base_hybrid = (
                    combined[result.chunk_id].dense_score * self.dense_weight +
                    normalized_sparse * self.sparse_weight
                )
                
                # Apply context-aware boosting
                context_boost = self._calculate_context_boost(combined[result.chunk_id])
                combined[result.chunk_id].hybrid_score = base_hybrid * context_boost
                
            else:
                # Add new sparse-only result
                result.sparse_score = normalized_sparse
                context_boost = self._calculate_context_boost(result)
                result.hybrid_score = normalized_sparse * self.sparse_weight * context_boost
                combined[result.chunk_id] = result
        
        # Final ranking with position-aware scoring
        results = list(combined.values())
        results = self._apply_position_aware_ranking(results)
        
        return results
    
    def _calculate_context_boost(self, result: RetrievalResult) -> float:
        """Calculate context-aware boosting factor for extended context scenarios"""
        boost = 1.0
        metadata = result.metadata
        
        # Boost based on content characteristics
        content_length = len(result.content)
        
        # Optimal length boost (prefer comprehensive but not overly long content)
        if 800 <= content_length <= 2000:  # Sweet spot for 10K context
            boost *= 1.1
        elif content_length > 3000:  # Penalize very long chunks slightly
            boost *= 0.95
        
        # Section type boosting
        if metadata.get('section'):
            section = metadata['section'].lower()
            if any(keyword in section for keyword in ['procedure', 'step', 'guide', 'how to']):
                boost *= 1.15  # Boost procedural content
            elif any(keyword in section for keyword in ['overview', 'introduction', 'summary']):
                boost *= 1.05  # Slight boost for introductory content
        
        # Token count boosting (prefer well-sized chunks)
        token_count = metadata.get('token_count', 0)
        if 200 <= token_count <= 1500:  # Optimal range for extended context
            boost *= 1.08
        
        # Chunk type boosting
        chunk_type = metadata.get('chunk_type', '')
        if chunk_type == 'semantic':
            boost *= 1.05  # Prefer semantic chunks
        
        return min(boost, 1.3)  # Cap boost at 30%
    
    def _apply_position_aware_ranking(self, results: List[RetrievalResult]) -> List[RetrievalResult]:
        """Apply position-aware ranking for better diversity in extended context"""
        # Sort by hybrid score first
        results.sort(key=lambda x: x.hybrid_score, reverse=True)
        
        # Apply slight position-based adjustment to encourage diversity
        for i, result in enumerate(results):
            if i < 15:  # Adjust more results for 10K context
                position_factor = 1.0 - (i * 0.005)  # Smaller decreasing factor for extended context
                result.hybrid_score *= position_factor
        
        # Final sort
        results.sort(key=lambda x: x.hybrid_score, reverse=True)
        
        return results
    
    async def _rerank_results(self, query: str, results: List[RetrievalResult]) -> List[RetrievalResult]:
        """
        Advanced reranking using cross-encoder model for precise relevance scoring
        
        Uses cross-encoder/ms-marco-MiniLM-L-6-v2 for state-of-the-art passage reranking
        Fallback to improved similarity scoring if cross-encoder unavailable
        """
        try:
            reranked = []
            
            # Prepare results for reranking
            candidates = results[:self.max_reranked_results]
            
            if self.cross_encoder is not None:
                # Use cross-encoder for precise reranking
                rerank_scores = self._cross_encoder_score(query, candidates)
            else:
                # Fallback to advanced similarity scoring
                rerank_scores = self._advanced_similarity_score(query, candidates)
            
            # Combine hybrid and rerank scores with optimized weighting
            for i, result in enumerate(candidates):
                rerank_score = rerank_scores[i]
                
                # Optimized score combination for 10K context window
                # Emphasize rerank score more for better precision
                result.rerank_score = rerank_score
                result.final_score = (
                    result.hybrid_score * 0.6 +  # Reduced hybrid weight
                    rerank_score * 0.4           # Increased rerank weight
                )
                
                reranked.append(result)
            
            # Sort by final score
            reranked.sort(key=lambda x: x.final_score, reverse=True)
            
            # Add rank positions
            for i, result in enumerate(reranked):
                result.rank_position = i + 1
            
            logger.info(f"Reranked {len(reranked)} results using {'cross-encoder' if self.cross_encoder else 'similarity'}")
            return reranked
            
        except Exception as e:
            logger.error(f"Reranking failed: {e}")
            return results[:self.max_reranked_results]
    
    def _cross_encoder_score(self, query: str, candidates: List[RetrievalResult]) -> List[float]:
        """
        Score query-passage pairs using cross-encoder model
        
        Args:
            query: User query
            candidates: List of retrieval results to score
            
        Returns:
            List of cross-encoder scores (higher = more relevant)
        """
        try:
            # Prepare query-passage pairs for cross-encoder
            pairs = []
            for result in candidates:
                # Truncate content to avoid token limits
                content = result.content[:1000]  # Reasonable limit for cross-encoder
                pairs.append([query, content])
            
            # Get cross-encoder scores
            scores = self.cross_encoder.predict(pairs)
            
            # Normalize scores to [0, 1] range
            if len(scores) > 1:
                min_score = min(scores)
                max_score = max(scores)
                if max_score > min_score:
                    scores = [(s - min_score) / (max_score - min_score) for s in scores]
                else:
                    scores = [1.0] * len(scores)
            else:
                scores = [1.0] if len(scores) == 1 else []
            
            return scores
            
        except Exception as e:
            logger.error(f"Cross-encoder scoring failed: {e}")
            return [0.5] * len(candidates)  # Neutral scores as fallback
    
    def _advanced_similarity_score(self, query: str, candidates: List[RetrievalResult]) -> List[float]:
        """
        Advanced similarity scoring when cross-encoder is unavailable
        
        Combines multiple similarity metrics for better ranking
        """
        try:
            scores = []
            query_lower = query.lower()
            query_words = set(query_lower.split())
            
            for result in candidates:
                content_lower = result.content.lower()
                content_words = set(content_lower.split())
                
                # 1. Word overlap score
                if query_words:
                    overlap = len(query_words.intersection(content_words))
                    overlap_score = overlap / len(query_words)
                else:
                    overlap_score = 0.0
                
                # 2. Substring matching score
                substring_score = 0.0
                for word in query_words:
                    if word in content_lower:
                        substring_score += 1
                substring_score = substring_score / len(query_words) if query_words else 0.0
                
                # 3. Length penalty (prefer comprehensive but not overly long content)
                content_length = len(result.content)
                if content_length > 0:
                    optimal_length = 500  # Optimal passage length
                    length_penalty = min(1.0, optimal_length / content_length) if content_length > optimal_length else 1.0
                else:
                    length_penalty = 0.0
                
                # Combine scores with weights
                combined_score = (
                    overlap_score * 0.4 +
                    substring_score * 0.4 +
                    length_penalty * 0.2
                )
                
                scores.append(min(combined_score, 1.0))
            
            return scores
            
        except Exception as e:
            logger.error(f"Advanced similarity scoring failed: {e}")
            return [0.5] * len(candidates)
    
    async def _context_fusion(self, query: str, results: List[RetrievalResult], 
                            processed_query: ProcessedQuery) -> Tuple[List[RetrievalResult], str]:
        """
        Advanced context selection and fusion optimized for 10K token window
        
        Features:
        - Intelligent content prioritization
        - Diversity injection to avoid redundancy
        - Rich metadata preservation
        - Optimal token utilization without constraint/compaction
        """
        try:
            # Extended selection for 10K window - get more results
            extended_results = results[:min(len(results), 15)]  # Increased from 5
            
            # Apply diversity injection to prevent redundancy
            diverse_results = self._apply_diversity_injection(extended_results, query)
            
            # Build enriched context with advanced formatting
            context_parts = []
            total_tokens = 0
            section_coverage = set()
            
            # Reserve space for query context and formatting
            reserved_tokens = 200
            available_tokens = self.context_window_size - reserved_tokens
            
            for i, result in enumerate(diverse_results):
                content = result.content
                metadata = result.metadata
                
                # Enhanced metadata extraction
                section_info = self._extract_section_info(metadata)
                relevance_info = f"Relevance: {result.final_score:.3f}"
                
                # Build rich context part with enhanced formatting
                context_header = f"=== SOURCE {i+1} {section_info} ===\n{relevance_info}\n"
                context_body = content
                context_part = f"{context_header}{context_body}"
                
                # More accurate token estimation (GPT-style: ~0.75 tokens per word)
                estimated_tokens = self._estimate_tokens(context_part)
                
                # Check if we can fit this content
                if total_tokens + estimated_tokens <= available_tokens:
                    context_parts.append(context_part)
                    total_tokens += estimated_tokens
                    
                    # Track section coverage
                    if section_info:
                        section_coverage.add(section_info)
                        
                elif available_tokens - total_tokens > 100:  # Meaningful space remaining
                    # Smart truncation preserving key information
                    truncated_content = self._smart_truncate(
                        content, 
                        available_tokens - total_tokens - len(context_header) - 20
                    )
                    if truncated_content:
                        truncated_part = f"{context_header}{truncated_content}... [TRUNCATED]"
                        context_parts.append(truncated_part)
                        total_tokens += self._estimate_tokens(truncated_part)
                    break
                else:
                    break  # No meaningful space left
            
            # Add query context and summary
            query_context = self._build_query_context(query, processed_query, section_coverage)
            
            # Final assembly with optimal structure
            fused_context = self._assemble_final_context(query_context, context_parts)
            
            final_token_count = self._estimate_tokens(fused_context)
            
            logger.info(f"Advanced context fusion: {len(context_parts)} sources, "
                       f"{len(section_coverage)} sections, {final_token_count} tokens "
                       f"({final_token_count/self.context_window_size*100:.1f}% of 10K limit)")
            
            return diverse_results[:len(context_parts)], fused_context
            
        except Exception as e:
            logger.error(f"Context fusion failed: {e}")
            # Fallback to simple fusion
            return await self._simple_context_fusion(results[:self.max_final_results])
    
    def _apply_diversity_injection(self, results: List[RetrievalResult], query: str) -> List[RetrievalResult]:
        """Apply diversity injection to prevent redundant content"""
        if len(results) <= 3:
            return results  # No need for diversity with few results
        
        diverse_results = [results[0]]  # Always include top result
        used_keywords = set(results[0].content.lower().split()[:20])  # Key terms from top result
        
        for result in results[1:]:
            content_keywords = set(result.content.lower().split()[:20])
            overlap_ratio = len(used_keywords.intersection(content_keywords)) / len(content_keywords) if content_keywords else 0
            
            # Include if sufficiently different or high-scoring
            if overlap_ratio < 0.7 or result.final_score > 0.9:
                diverse_results.append(result)
                used_keywords.update(content_keywords)
                
                if len(diverse_results) >= 10:  # Reasonable limit for 10K window
                    break
        
        return diverse_results
    
    def _extract_section_info(self, metadata: Dict[str, Any]) -> str:
        """Extract rich section information from metadata"""
        section_parts = []
        
        if 'section' in metadata:
            section_parts.append(metadata['section'])
        if 'subsection' in metadata:
            section_parts.append(metadata['subsection'])
        if 'page_number' in metadata:
            section_parts.append(f"Page {metadata['page_number']}")
        
        return " | ".join(section_parts) if section_parts else ""
    
    def _estimate_tokens(self, text: str) -> int:
        """More accurate token estimation for GPT-style models"""
        # Rough approximation: 0.75 tokens per word for English text
        words = len(text.split())
        return int(words * 0.75)
    
    def _smart_truncate(self, content: str, max_tokens: int) -> str:
        """Smart truncation preserving sentence boundaries and key information"""
        if max_tokens <= 0:
            return ""
        
        # Convert token limit to approximate word limit
        max_words = int(max_tokens / 0.75)
        
        words = content.split()
        if len(words) <= max_words:
            return content
        
        # Try to truncate at sentence boundary
        sentences = content.split('. ')
        current_length = 0
        result_sentences = []
        
        for sentence in sentences:
            sentence_words = len(sentence.split())
            if current_length + sentence_words <= max_words:
                result_sentences.append(sentence)
                current_length += sentence_words
            else:
                break
        
        if result_sentences:
            return '. '.join(result_sentences)
        else:
            # Fallback to word truncation
            return ' '.join(words[:max_words])
    
    def _build_query_context(self, query: str, processed_query: ProcessedQuery, sections: Set[str]) -> str:
        """Build enhanced query context section"""
        intent_confidence = processed_query.intent.confidence if processed_query.intent else 0.0
        context_lines = [
            f"=== QUERY ANALYSIS ===",
            f"Original Query: {query}",
            f"Intent: {processed_query.intent.intent_type if processed_query.intent else 'unknown'} (confidence: {intent_confidence:.3f})",
            f"Sections Covered: {', '.join(sorted(sections)) if sections else 'Multiple'}"
        ]
        
        if processed_query.expansion and processed_query.expansion.expanded_terms:
            context_lines.append(f"Key Terms: {', '.join(processed_query.expansion.expanded_terms[:8])}")
        
        return "\n".join(context_lines)
    
    def _assemble_final_context(self, query_context: str, context_parts: List[str]) -> str:
        """Assemble the final context with optimal structure"""
        separator = "\n" + "="*50 + "\n"
        
        final_parts = [query_context]
        final_parts.extend(context_parts)
        
        return separator.join(final_parts)
    
    async def _simple_context_fusion(self, results: List[RetrievalResult]) -> Tuple[List[RetrievalResult], str]:
        """Simple fallback context fusion"""
        try:
            context_parts = []
            for i, result in enumerate(results):
                context_parts.append(f"[Source {i+1}] {result.content}")
            
            fused_context = "\n\n".join(context_parts)
            return results, fused_context
            
        except Exception as e:
            logger.error(f"Simple context fusion failed: {e}")
            return results, ""
    
    def get_retrieval_stats(self) -> Dict[str, Any]:
        """Get retrieval performance statistics"""
        return self.retrieval_stats.copy()
    
    def clear_cache(self):
        """Clear any cached results"""
        # Implement caching and clearing if needed
        pass 