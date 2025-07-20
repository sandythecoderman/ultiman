#!/usr/bin/env python3
"""
Document Processing Script for RAG Pipeline
Processes ITIL documentation and populates the vector database
"""

import sys
import os
import time
import logging
from pathlib import Path
from typing import List, Dict, Any

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from core.document_processor import DocumentProcessor
from core.embedding_engine import EmbeddingEngine
from core.vector_database import FaissVectorDatabase

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('document_processing.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class DocumentProcessingPipeline:
    """Complete pipeline for processing documents and populating vector database"""
    
    def __init__(self):
        """Initialize the processing pipeline components"""
        logger.info("Initializing Document Processing Pipeline...")
        
        try:
            self.processor = DocumentProcessor()
            self.embedding_engine = EmbeddingEngine()
            # Use FLAT index for small datasets (better accuracy)  
            # Note: all-mpnet-base-v2 uses 768-dimensional embeddings
            self.vector_db = FaissVectorDatabase(
                embedding_dimension=768,
                index_type="FLAT",  # Exact search for small datasets
                metric="cosine"
            )
            logger.info("✅ All components initialized successfully")
        except Exception as e:
            logger.error(f"❌ Failed to initialize components: {e}")
            raise
    
    def process_file(self, file_path: str) -> List[Any]:
        """Process a single file and return DocumentChunk objects"""
        logger.info(f"📄 Processing file: {file_path}")
        
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
        
        # Get file info
        file_size = os.path.getsize(file_path) / 1024 / 1024  # MB
        logger.info(f"📊 File size: {file_size:.2f} MB")
        
        start_time = time.time()
        # Use ALL chunking strategies for comprehensive coverage
        chunks_dict = self.processor.process_document(
            file_path, 
            ['semantic', 'recursive', 'hierarchical']
        )
        processing_time = time.time() - start_time
        
        # Combine all chunk types for richer retrieval context
        all_chunks = []
        for strategy, chunks in chunks_dict.items():
            logger.info(f"📊 {strategy.capitalize()} strategy: {len(chunks)} chunks")
            all_chunks.extend(chunks)
        
        logger.info(f"✅ Processed {len(all_chunks)} total chunks ({processing_time:.2f}s) using multi-strategy approach")
        logger.info(f"   - Strategies used: {list(chunks_dict.keys())}")
        
        return all_chunks
    
    def generate_embeddings(self, chunks: List[Any]) -> List[Any]:
        """Generate embeddings for all chunks using the EmbeddingEngine"""
        logger.info(f"🧮 Generating embeddings for {len(chunks)} chunks using multi-stage strategy...")
        
        start_time = time.time()
        
        try:
            # Use the embed_chunks method which handles both dense and sparse embeddings
            embedding_results = self.embedding_engine.embed_chunks(chunks)
            embedding_time = time.time() - start_time
            
            logger.info(f"✅ Generated {len(embedding_results)} embeddings in {embedding_time:.2f}s")
            return embedding_results
            
        except Exception as e:
            logger.error(f"❌ Failed to generate embeddings: {e}")
            raise
    
    def populate_database(self, embedding_results: List[Any]) -> None:
        """Populate the vector database with embedding results"""
        logger.info(f"💾 Populating vector database with {len(embedding_results)} embedding results...")
        
        start_time = time.time()
        success = self.vector_db.add_embeddings(embedding_results)
        db_time = time.time() - start_time
        
        if success:
            # Get database stats
            stats = self.vector_db.get_stats()
            doc_count = stats.get('total_vectors', 0)
            
            logger.info(f"✅ Database populated in {db_time:.2f}s")
            logger.info(f"📊 Total documents in database: {doc_count}")
        else:
            logger.error("❌ Failed to populate database")
    
    def save_processed_chunks(self, chunks: List[Any]) -> None:
        """Save processed chunks with relationships and metadata to JSON"""
        logger.info(f"💾 Saving {len(chunks)} processed chunks with metadata...")
        
        output_dir = "src/knowledgeBase/agent/rag/storage/processed_chunks/"
        os.makedirs(output_dir, exist_ok=True)
        
        # Convert chunks to serializable format
        chunk_data = []
        for chunk in chunks:
            chunk_dict = {
                "chunk_id": chunk.chunk_id,
                "content": chunk.content,
                "source_file": chunk.source_file,
                "chunk_type": chunk.chunk_type,
                "chunk_index": chunk.chunk_index,
                "token_count": chunk.token_count,
                "character_count": chunk.character_count,
                "parent_chunk_id": chunk.parent_chunk_id,
                "child_chunk_ids": chunk.child_chunk_ids,
                "metadata": chunk.metadata
            }
            chunk_data.append(chunk_dict)
        
        # Save to JSON file with timestamp
        timestamp = int(time.time())
        filename = f"chunks_metadata_{timestamp}.json"
        filepath = os.path.join(output_dir, filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            import json
            json.dump(chunk_data, f, indent=2, ensure_ascii=False)
        
        logger.info(f"✅ Chunk metadata saved to {filepath}")
    
    def process_and_store(self, file_path: str) -> Dict[str, Any]:
        """Complete pipeline: process file, generate embeddings, store in database"""
        pipeline_start = time.time()
        
        logger.info("🚀 Starting complete document processing pipeline...")
        logger.info("=" * 60)
        
        try:
            # Step 1: Process file into DocumentChunk objects
            chunks = self.process_file(file_path)
            
            # Step 2: Generate embeddings (returns EmbeddingResult objects)
            embedding_results = self.generate_embeddings(chunks)
            
            # Step 3: Populate database with embedding results
            self.populate_database(embedding_results)
            
            # Step 4: Save processed chunks metadata  
            self.save_processed_chunks(chunks)
            
            # Step 5: Save the vector database to disk
            output_dir = os.path.join(os.path.dirname(__file__), '../storage/vector_storage')
            os.makedirs(output_dir, exist_ok=True)
            self.vector_db.save_database(output_dir)
            logger.info(f"✅ Faiss index saved to {output_dir}/faiss_index.bin")
            
            pipeline_time = time.time() - pipeline_start
            
            # Summary stats
            db_stats = self.vector_db.get_stats()
            stats = {
                'file_path': file_path,
                'chunks_processed': len(chunks),
                'embeddings_generated': len(embedding_results),
                'total_time': pipeline_time,
                'database_count': db_stats.get('total_vectors', 0)
            }
            
            logger.info("=" * 60)
            logger.info("🎉 PIPELINE COMPLETED SUCCESSFULLY!")
            logger.info(f"📊 SUMMARY:")
            logger.info(f"   File: {stats['file_path']}")
            logger.info(f"   Chunks processed: {stats['chunks_processed']}")
            logger.info(f"   Embeddings generated: {stats['embeddings_generated']}")
            logger.info(f"   Total time: {stats['total_time']:.2f}s")
            logger.info(f"   Database total: {stats['database_count']} documents")
            logger.info("=" * 60)
            
            return stats
            
        except Exception as e:
            logger.error(f"❌ Pipeline failed: {e}")
            raise

def main():
    """Main function to run the document processing"""
    
    # File to process
    file_path = os.path.join(os.path.dirname(__file__), '../../../data/infraon_user_guide.md')
    
    print("🔄 INFRAON USER GUIDE PROCESSING")
    print("=" * 50)
    print(f"📄 Target file: {file_path}")
    print("=" * 50)
    
    try:
        # Initialize pipeline
        pipeline = DocumentProcessingPipeline()
        
        # Process the document
        stats = pipeline.process_and_store(file_path)
        
        print("\n🎯 NEXT STEPS:")
        print("1. Test the RAG pipeline: python pipeline/rag_pipeline.py")
        print("2. Or integrate into your application")
        
        return 0
        
    except Exception as e:
        logger.error(f"❌ Script failed: {e}")
        return 1

if __name__ == "__main__":
    exit(main()) 