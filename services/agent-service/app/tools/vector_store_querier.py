import logging
import asyncio
import time
import os
import pickle
import numpy as np
from typing import Dict, Any, List, Optional, Tuple

# Suppress FAISS GPU warnings
logging.getLogger('faiss').setLevel(logging.WARNING)

try:
    import faiss
except ImportError:
    faiss = None

try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    SentenceTransformer = None

from ..models.agent_models import ToolExecutionContext

logger = logging.getLogger(__name__)

class VectorStoreQuerier:
    """Tool for querying FAISS vector stores for semantic search"""
    
    def __init__(self):
        self.vector_store_path = os.getenv('VECTOR_STORE_PATH', './data/vector_stores')
        self.faiss_index_path = os.getenv('FAISS_INDEX_PATH', './data/faiss_indexes')
        self.model_name = 'all-MiniLM-L6-v2'  # Lightweight sentence transformer
        
        # Initialize sentence transformer
        self.encoder = SentenceTransformer(self.model_name)
        
        # Available vector stores
        self.vector_stores = {
            'api_documentation': {
                'index_file': 'api_docs.index',
                'metadata_file': 'api_docs.pkl',
                'description': 'Infraon API documentation and usage examples'
            },
            'user_manuals': {
                'index_file': 'user_manuals.index',
                'metadata_file': 'user_manuals.pkl',
                'description': 'User manuals and tutorials'
            },
            'troubleshooting': {
                'index_file': 'troubleshooting.index',
                'metadata_file': 'troubleshooting.pkl',
                'description': 'Troubleshooting guides and solutions'
            },
            'announcements': {
                'index_file': 'announcements.index',
                'metadata_file': 'announcements.pkl',
                'description': 'System announcements and updates'
            }
        }
        
        # Loaded indexes cache
        self._loaded_indexes = {}
        self._loaded_metadata = {}
        
        logger.info(f"🔍 VectorStoreQuerier initialized with model: {self.model_name}")
    
    async def execute(self, parameters: Dict[str, Any], context: ToolExecutionContext) -> Dict[str, Any]:
        """
        Execute a vector store query for semantic search
        
        Parameters:
        - query: Search query text
        - vector_store: Which vector store to search ('api_documentation', 'user_manuals', etc.)
        - top_k: Number of top results to return (default: 5)
        - similarity_threshold: Minimum similarity threshold (default: 0.3)
        """
        
        query = parameters.get('query', '').strip()
        vector_store = parameters.get('vector_store', 'api_documentation')
        top_k = parameters.get('top_k', 5)
        similarity_threshold = parameters.get('similarity_threshold', 0.3)
        
        if not query:
            return {
                'success': False,
                'error': 'No query provided',
                'message': 'Query text is required for vector search'
            }
        
        logger.info(f"🔍 Searching vector store '{vector_store}' for: {query}")
        
        try:
            # Load the vector store if needed
            index, metadata = await self._load_vector_store(vector_store)
            
            if index is None or metadata is None:
                return {
                    'success': False,
                    'error': f'Vector store "{vector_store}" not found or empty',
                    'message': f'Unable to load vector store: {vector_store}',
                    'available_stores': list(self.vector_stores.keys())
                }
            
            # Encode the query
            query_vector = self.encoder.encode([query])
            
            # Search the index
            similarities, indices = index.search(query_vector, top_k)
            
            # Format results
            results = []
            for i, (similarity, idx) in enumerate(zip(similarities[0], indices[0])):
                
                # Check similarity threshold
                if similarity < similarity_threshold:
                    continue
                
                # Get metadata for this result
                doc_metadata = metadata[idx] if idx < len(metadata) else {}
                
                result = {
                    'rank': i + 1,
                    'similarity_score': float(similarity),
                    'content': doc_metadata.get('content', ''),
                    'title': doc_metadata.get('title', ''),
                    'source': doc_metadata.get('source', ''),
                    'document_type': doc_metadata.get('document_type', ''),
                    'tags': doc_metadata.get('tags', []),
                    'metadata': doc_metadata
                }
                
                results.append(result)
            
            logger.info(f"✅ Vector search completed. Found {len(results)} relevant results")
            
            return {
                'success': True,
                'query': query,
                'vector_store': vector_store,
                'results': results,
                'total_results': len(results),
                'search_parameters': {
                    'top_k': top_k,
                    'similarity_threshold': similarity_threshold
                },
                'message': f"Found {len(results)} relevant documents"
            }
            
        except Exception as e:
            logger.error(f"❌ Vector search failed: {str(e)}")
            
            return {
                'success': False,
                'query': query,
                'vector_store': vector_store,
                'error': str(e),
                'message': f"Failed to search vector store: {vector_store}"
            }
    
    async def _load_vector_store(self, store_name: str) -> Tuple[Optional[faiss.Index], Optional[List[Dict]]]:
        """Load a vector store index and metadata"""
        
        if store_name not in self.vector_stores:
            logger.error(f"Unknown vector store: {store_name}")
            return None, None
        
        # Check if already loaded
        if store_name in self._loaded_indexes and store_name in self._loaded_metadata:
            return self._loaded_indexes[store_name], self._loaded_metadata[store_name]
        
        store_config = self.vector_stores[store_name]
        index_path = os.path.join(self.faiss_index_path, store_config['index_file'])
        metadata_path = os.path.join(self.vector_store_path, store_config['metadata_file'])
        
        try:
            # Load FAISS index
            if os.path.exists(index_path):
                index = faiss.read_index(index_path)
                logger.info(f"📚 Loaded FAISS index for {store_name}: {index.ntotal} vectors")
            else:
                logger.warning(f"⚠️ FAISS index not found: {index_path}")
                # Create empty index for future use
                index = faiss.IndexFlatIP(384)  # 384 is the dimension for all-MiniLM-L6-v2
            
            # Load metadata
            if os.path.exists(metadata_path):
                with open(metadata_path, 'rb') as f:
                    metadata = pickle.load(f)
                logger.info(f"📚 Loaded metadata for {store_name}: {len(metadata)} documents")
            else:
                logger.warning(f"⚠️ Metadata file not found: {metadata_path}")
                metadata = []
            
            # Cache the loaded data
            self._loaded_indexes[store_name] = index
            self._loaded_metadata[store_name] = metadata
            
            return index, metadata
            
        except Exception as e:
            logger.error(f"❌ Failed to load vector store {store_name}: {str(e)}")
            return None, None
    
    async def search_api_documentation(self, query: str, top_k: int = 5) -> Dict[str, Any]:
        """Convenience method to search API documentation"""
        return await self.execute(
            parameters={
                'query': query,
                'vector_store': 'api_documentation',
                'top_k': top_k
            },
            context=ToolExecutionContext(session_id="direct", user_query=f"search_api_docs: {query}")
        )
    
    async def search_user_manuals(self, query: str, top_k: int = 5) -> Dict[str, Any]:
        """Convenience method to search user manuals"""
        return await self.execute(
            parameters={
                'query': query,
                'vector_store': 'user_manuals',
                'top_k': top_k
            },
            context=ToolExecutionContext(session_id="direct", user_query=f"search_user_manuals: {query}")
        )
    
    async def search_troubleshooting(self, query: str, top_k: int = 5) -> Dict[str, Any]:
        """Convenience method to search troubleshooting guides"""
        return await self.execute(
            parameters={
                'query': query,
                'vector_store': 'troubleshooting',
                'top_k': top_k
            },
            context=ToolExecutionContext(session_id="direct", user_query=f"search_troubleshooting: {query}")
        )
    
    async def add_document_to_store(self, store_name: str, content: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Add a new document to a vector store"""
        
        try:
            # Load or create the vector store
            index, existing_metadata = await self._load_vector_store(store_name)
            
            if index is None:
                # Create new index
                index = faiss.IndexFlatIP(384)
                existing_metadata = []
            
            # Encode the content
            content_vector = self.encoder.encode([content])
            
            # Add to index
            index.add(content_vector)
            
            # Add metadata
            doc_metadata = {
                'content': content,
                'timestamp': str(np.datetime64('now')),
                **metadata
            }
            existing_metadata.append(doc_metadata)
            
            # Update cache
            self._loaded_indexes[store_name] = index
            self._loaded_metadata[store_name] = existing_metadata
            
            # Save to disk
            await self._save_vector_store(store_name, index, existing_metadata)
            
            logger.info(f"✅ Added document to vector store: {store_name}")
            
            return {
                'success': True,
                'store_name': store_name,
                'total_documents': len(existing_metadata),
                'message': f'Document added to {store_name}'
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to add document to {store_name}: {str(e)}")
            
            return {
                'success': False,
                'store_name': store_name,
                'error': str(e),
                'message': f'Failed to add document to {store_name}'
            }
    
    async def _save_vector_store(self, store_name: str, index: faiss.Index, metadata: List[Dict]):
        """Save vector store to disk"""
        
        # Ensure directories exist
        os.makedirs(self.faiss_index_path, exist_ok=True)
        os.makedirs(self.vector_store_path, exist_ok=True)
        
        store_config = self.vector_stores[store_name]
        index_path = os.path.join(self.faiss_index_path, store_config['index_file'])
        metadata_path = os.path.join(self.vector_store_path, store_config['metadata_file'])
        
        # Save FAISS index
        faiss.write_index(index, index_path)
        
        # Save metadata
        with open(metadata_path, 'wb') as f:
            pickle.dump(metadata, f)
        
        logger.info(f"💾 Saved vector store: {store_name}")
    
    def get_available_stores(self) -> Dict[str, str]:
        """Get list of available vector stores"""
        return {name: config['description'] for name, config in self.vector_stores.items()}
    
    async def get_store_stats(self, store_name: str) -> Dict[str, Any]:
        """Get statistics for a vector store"""
        
        try:
            index, metadata = await self._load_vector_store(store_name)
            
            if index is None or metadata is None:
                return {
                    'store_name': store_name,
                    'exists': False,
                    'message': f'Vector store {store_name} not found'
                }
            
            return {
                'store_name': store_name,
                'exists': True,
                'total_vectors': index.ntotal,
                'total_documents': len(metadata),
                'vector_dimension': index.d,
                'description': self.vector_stores[store_name]['description']
            }
            
        except Exception as e:
            return {
                'store_name': store_name,
                'exists': False,
                'error': str(e),
                'message': f'Failed to get stats for {store_name}'
            }
    
    async def initialize_empty_stores(self):
        """Initialize empty vector stores for all configured stores"""
        
        logger.info("🔧 Initializing empty vector stores...")
        
        for store_name in self.vector_stores.keys():
            try:
                # Create empty index
                index = faiss.IndexFlatIP(384)
                metadata = []
                
                # Save to cache and disk
                self._loaded_indexes[store_name] = index
                self._loaded_metadata[store_name] = metadata
                await self._save_vector_store(store_name, index, metadata)
                
                logger.info(f"✅ Initialized empty vector store: {store_name}")
                
            except Exception as e:
                logger.error(f"❌ Failed to initialize {store_name}: {str(e)}")
        
        logger.info("🔧 Vector store initialization completed") 