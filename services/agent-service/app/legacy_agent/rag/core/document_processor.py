"""
Advanced Document Processing Pipeline for RAG System
Implements semantic, recursive, and hierarchical chunking with metadata enrichment
"""

import os
import re
import json
import hashlib
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from pathlib import Path
import logging

import tiktoken
from langchain.text_splitter import (
    RecursiveCharacterTextSplitter,
    MarkdownHeaderTextSplitter,
    MarkdownTextSplitter
)
from langchain_text_splitters import TokenTextSplitter

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def _is_serializable(obj: Any) -> bool:
    """Check if an object is JSON serializable"""
    try:
        json.dumps(obj)
        return True
    except (TypeError, ValueError):
        return False

def _clean_metadata(metadata: Dict[str, Any]) -> Dict[str, Any]:
    """Clean metadata of non-serializable objects like regex Match objects"""
    cleaned = {}
    for key, value in metadata.items():
        if _is_serializable(value):
            cleaned[key] = value
        else:
            # Convert non-serializable objects to string representation
            cleaned[key] = str(value)
    return cleaned

@dataclass
class DocumentChunk:
    """Represents a processed document chunk with metadata"""
    content: str
    chunk_id: str
    source_file: str
    chunk_type: str  # 'semantic', 'recursive', 'hierarchical'
    chunk_index: int
    token_count: int
    character_count: int
    metadata: Dict[str, Any]
    parent_chunk_id: Optional[str] = None
    child_chunk_ids: List[str] = None
    
    def __post_init__(self):
        if self.child_chunk_ids is None:
            self.child_chunk_ids = []

class DocumentProcessor:
    """Advanced document processing with multiple chunking strategies"""
    
    def __init__(self, 
                 chunk_size: int = 1000,  # Keep original chunk size
                 chunk_overlap: int = 200,  # Keep original overlap
                 min_chunk_size: int = 100,  # Keep original minimum
                 max_chunk_size: int = 4000):
        """
        Initialize the document processor with 10K token context window for LLM
        
        Args:
            chunk_size: Target chunk size in tokens (kept standard for optimal retrieval)
            chunk_overlap: Overlap between chunks in tokens (standard overlap)
            min_chunk_size: Minimum acceptable chunk size (standard minimum)
            max_chunk_size: Maximum acceptable chunk size (4K tokens max per chunk)
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.min_chunk_size = min_chunk_size
        self.max_chunk_size = max_chunk_size
        
        # Initialize tokenizer for accurate token counting
        self.tokenizer = tiktoken.get_encoding("cl100k_base")
        
        # Initialize text splitters
        self._init_splitters()
        
        logger.info(f"DocumentProcessor initialized with chunk_size={chunk_size}, overlap={chunk_overlap}")
    
    def _init_splitters(self):
        """Initialize various text splitters"""
        # Recursive character text splitter for general text
        self.recursive_splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size * 4,  # Approximate character to token ratio
            chunk_overlap=self.chunk_overlap * 4,
            length_function=len,
            separators=["\n\n", "\n", " ", ""]
        )
        
        # Token-based splitter for precise token control
        self.token_splitter = TokenTextSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap,
            encoding_name="cl100k_base"
        )
        
        # Markdown header text splitter for hierarchical structure
        self.markdown_splitter = MarkdownHeaderTextSplitter(
            headers_to_split_on=[
                ("#", "header_1"),
                ("##", "header_2"), 
                ("###", "header_3"),
                ("####", "header_4"),
                ("#####", "header_5"),
                ("######", "header_6"),
            ]
        )
        
        # Markdown text splitter
        self.md_text_splitter = MarkdownTextSplitter(
            chunk_size=self.chunk_size * 4,
            chunk_overlap=self.chunk_overlap * 4
        )
    
    def count_tokens(self, text: str) -> int:
        """Count tokens in text using tiktoken"""
        return len(self.tokenizer.encode(text))
    
    def generate_chunk_id(self, content: str, index: int, chunk_type: str) -> str:
        """Generate unique chunk ID based on content hash and metadata"""
        content_hash = hashlib.md5(content.encode()).hexdigest()[:8]
        return f"{chunk_type}_{index}_{content_hash}"
    
    def extract_metadata(self, content: str, file_path: str) -> Dict[str, Any]:
        """Extract comprehensive metadata from content and file"""
        metadata = {
            # File metadata
            "file_path": file_path,
            "file_name": os.path.basename(file_path),
            "file_extension": os.path.splitext(file_path)[1],
            
            # Content metrics
            "character_count": len(content),
            "token_count": self.count_tokens(content),
            "line_count": content.count('\n') + 1,
            "word_count": len(content.split()),
            
            # Document structure
            "headers": self._extract_headers(content),
            "section_depth": self._get_section_depth(content),
            "has_code_blocks": '```' in content or '`' in content,
            "has_lists": bool(re.search(r'^\s*[-*+]\s+', content, re.MULTILINE)),
            "has_numbered_lists": bool(re.search(r'^\s*\d+\.\s+', content, re.MULTILINE)),
            "has_tables": '|' in content and re.search(r'\|.*\|.*\|', content),
            
            # ITIL-specific patterns
            "has_procedures": bool(re.search(r'procedure|step|process', content, re.IGNORECASE)),
            "has_warnings": bool(re.search(r'warning|caution|note|important', content, re.IGNORECASE)),
            "has_examples": bool(re.search(r'example|for instance|e\.g\.|such as', content, re.IGNORECASE)),
            
            # Technical indicators
            "has_api_refs": bool(re.search(r'api|endpoint|request|response', content, re.IGNORECASE)),
            "has_config": bool(re.search(r'config|setting|parameter|option', content, re.IGNORECASE)),
            "has_commands": bool(re.search(r'command|cmd|execute|run', content, re.IGNORECASE)),
        }
        
        # Extract headers if markdown
        if file_path.endswith('.md'):
            headers = re.findall(r'^(#{1,6})\s+(.+)$', content, re.MULTILINE)
            metadata["headers"] = [(len(h[0]), h[1].strip()) for h in headers]
            metadata["header_count"] = len(headers)
        
        # Extract sections based on patterns
        sections = re.split(r'\n\s*#+\s+', content)
        metadata["section_count"] = len(sections) if len(sections) > 1 else 1
        
        return metadata
    
    def _extract_headers(self, content: str) -> List[Dict[str, Any]]:
        """Extract markdown headers with hierarchy information"""
        headers = []
        header_pattern = r'^(#{1,6})\s+(.+)$'
        
        for i, line in enumerate(content.split('\n')):
            match = re.match(header_pattern, line.strip())
            if match:
                level = len(match.group(1))
                text = match.group(2).strip()
                headers.append({
                    "level": level,
                    "text": text,
                    "line_number": i + 1
                })
        
        return headers
    
    def _get_section_depth(self, content: str) -> int:
        """Get the maximum header depth in the content"""
        headers = self._extract_headers(content)
        return max([h["level"] for h in headers]) if headers else 0
    
    def semantic_chunking(self, content: str, file_path: str) -> List[DocumentChunk]:
        """
        Enhanced semantic chunking optimized for 10K context window
        
        Features:
        - Preserves semantic coherence with larger chunks
        - Better handling of technical documentation
        - Optimized for ITIL/technical content
        """
        chunks = []
        
        # Enhanced semantic boundaries for technical documentation
        semantic_boundaries = [
            r'\n\s*\n\s*\n',  # Triple newlines - major section breaks
            r'\n\s*#{1,6}\s+',  # Markdown headers
            r'\n\s*\*\*[^*]+\*\*\s*\n',  # Bold headers
            r'\n\s*[-=]{3,}\s*\n',  # Horizontal rules
            r'\n\s*\d+\.\s+[A-Z]',  # Numbered sections (uppercase start)
            r'\n\s*Step\s+\d+',  # Step-by-step instructions
            r'\n\s*Procedure:',  # ITIL procedures
            r'\n\s*Note:',  # Important notes
            r'\n\s*Warning:',  # Warnings
            r'\n\s*Example:',  # Examples
        ]
        
        # Split content using semantic boundaries
        sections = [content]
        for pattern in semantic_boundaries:
            new_sections = []
            for section in sections:
                new_sections.extend(re.split(pattern, section))
            sections = [s.strip() for s in new_sections if s.strip()]
        
        # Process sections with enhanced logic for 10K context
        chunk_index = 0
        current_chunk_content = ""
        current_chunk_tokens = 0
        
        for section in sections:
            section = section.strip()
            if len(section) < 50:  # Skip very small sections
                continue
            
            section_tokens = self.count_tokens(section)
            
            # If this section alone exceeds target size, split it
            if section_tokens > self.chunk_size * 1.2:  # Allow 20% over target
                # Finalize current chunk if it has content
                if current_chunk_content and current_chunk_tokens >= self.min_chunk_size:
                    chunk = self._create_chunk(
                        content=current_chunk_content.strip(),
                        file_path=file_path,
                        chunk_type="semantic",
                        chunk_index=chunk_index,
                        additional_metadata={"token_count": current_chunk_tokens}
                    )
                    chunks.append(chunk)
                    chunk_index += 1
                    current_chunk_content = ""
                    current_chunk_tokens = 0
                
                # Split large section using token splitter
                sub_chunks = self.token_splitter.split_text(section)
                for sub_chunk in sub_chunks:
                    sub_chunk = sub_chunk.strip()
                    if len(sub_chunk) >= self.min_chunk_size:
                        chunk = self._create_chunk(
                            content=sub_chunk,
                            file_path=file_path,
                            chunk_type="semantic",
                            chunk_index=chunk_index,
                            additional_metadata={
                                "token_count": self.count_tokens(sub_chunk),
                                "is_large_section_split": True
                            }
                        )
                        chunks.append(chunk)
                        chunk_index += 1
            
            # Try to combine with current chunk if it fits
            elif current_chunk_tokens + section_tokens <= self.chunk_size * 1.5:  # Allow flexible sizing
                if current_chunk_content:
                    current_chunk_content += "\n\n" + section
                else:
                    current_chunk_content = section
                current_chunk_tokens += section_tokens
            
            # Current chunk is full, finalize it and start new one with semantic overlap
            else:
                if current_chunk_content and current_chunk_tokens >= self.min_chunk_size:
                    chunk = self._create_chunk(
                        content=current_chunk_content.strip(),
                        file_path=file_path,
                        chunk_type="semantic",
                        chunk_index=chunk_index,
                        additional_metadata={
                            "token_count": current_chunk_tokens,
                            "has_semantic_overlap": True
                        }
                    )
                    chunks.append(chunk)
                    chunk_index += 1
                
                # Implement semantic overlap: include last paragraph/section for context
                overlap_content = ""
                overlap_tokens = 0
                
                if current_chunk_content:
                    # Extract last meaningful section for overlap (up to overlap size)
                    sentences = current_chunk_content.split('\n\n')
                    for sentence in reversed(sentences):
                        sentence_tokens = self.count_tokens(sentence)
                        if overlap_tokens + sentence_tokens <= self.chunk_overlap:
                            overlap_content = sentence + "\n\n" + overlap_content
                            overlap_tokens += sentence_tokens
                        else:
                            break
                
                # Start new chunk with overlap + current section
                if overlap_content.strip():
                    current_chunk_content = overlap_content.strip() + "\n\n" + section
                    current_chunk_tokens = overlap_tokens + section_tokens
                else:
                    current_chunk_content = section
                    current_chunk_tokens = section_tokens
        
        # Finalize last chunk if it has content
        if current_chunk_content and current_chunk_tokens >= self.min_chunk_size:
            chunk = self._create_chunk(
                content=current_chunk_content.strip(),
                file_path=file_path,
                chunk_type="semantic",
                chunk_index=chunk_index,
                additional_metadata={"token_count": current_chunk_tokens}
            )
            chunks.append(chunk)
        
        logger.info(f"Semantic chunking produced {len(chunks)} chunks")
        return chunks
    
    def recursive_chunking(self, content: str, file_path: str) -> List[DocumentChunk]:
        """
        Recursive character-based chunking with smart separators
        Uses LangChain's RecursiveCharacterTextSplitter
        """
        # Split using recursive splitter
        text_chunks = self.recursive_splitter.split_text(content)
        
        chunks = []
        for i, chunk_content in enumerate(text_chunks):
            if len(chunk_content.strip()) >= self.min_chunk_size:
                chunk = self._create_chunk(
                    content=chunk_content.strip(),
                    file_path=file_path,
                    chunk_type="recursive",
                    chunk_index=i
                )
                chunks.append(chunk)
        
        logger.info(f"Recursive chunking produced {len(chunks)} chunks")
        return chunks
    
    def hierarchical_chunking(self, content: str, file_path: str) -> List[DocumentChunk]:
        """
        Hierarchical chunking that preserves document structure
        Creates parent-child relationships between chunks
        """
        chunks = []
        
        if not file_path.endswith('.md'):
            # For non-markdown, fall back to recursive chunking
            return self.recursive_chunking(content, file_path)
        
        # Split by markdown headers first
        header_splits = self.markdown_splitter.split_text(content)
        
        chunk_index = 0
        parent_chunks = {}  # Track parent chunks by header level
        
        for split in header_splits:
            if len(split.page_content.strip()) < self.min_chunk_size:
                continue
            
            # Extract header information from metadata
            header_level = 0
            header_text = ""
            if split.metadata:
                # Clean the metadata from LangChain splitter to prevent serialization issues
                cleaned_split_metadata = _clean_metadata(split.metadata)
                for key, value in cleaned_split_metadata.items():
                    if key.startswith('header_'):
                        level = int(key.split('_')[1])
                        if level > header_level:
                            header_level = level
                            header_text = str(value)  # Ensure it's a string
            
            # Create chunk with hierarchical metadata
            chunk_content = split.page_content.strip()
            
            # If chunk is too large, split it further but maintain hierarchy
            if self.count_tokens(chunk_content) > self.max_chunk_size:
                sub_chunks = self.token_splitter.split_text(chunk_content)
                parent_chunk_id = None
                
                for j, sub_chunk in enumerate(sub_chunks):
                    if len(sub_chunk.strip()) >= self.min_chunk_size:
                        chunk = self._create_chunk(
                            content=sub_chunk.strip(),
                            file_path=file_path,
                            chunk_type="hierarchical",
                            chunk_index=chunk_index,
                            additional_metadata={
                                "header_level": header_level,
                                "header_text": header_text,
                                "is_sub_chunk": True,
                                "sub_chunk_index": j
                            }
                        )
                        
                        # Set parent-child relationships
                        if j == 0:
                            parent_chunk_id = chunk.chunk_id
                            if header_level > 1 and (header_level - 1) in parent_chunks:
                                chunk.parent_chunk_id = parent_chunks[header_level - 1]
                        else:
                            chunk.parent_chunk_id = parent_chunk_id
                        
                        chunks.append(chunk)
                        chunk_index += 1
                        
                        # Update parent tracking for this level
                        if j == 0:
                            parent_chunks[header_level] = chunk.chunk_id
            else:
                chunk = self._create_chunk(
                    content=chunk_content,
                    file_path=file_path,
                    chunk_type="hierarchical",
                    chunk_index=chunk_index,
                    additional_metadata={
                        "header_level": header_level,
                        "header_text": header_text,
                        "is_sub_chunk": False
                    }
                )
                
                # Set parent-child relationships
                if header_level > 1 and (header_level - 1) in parent_chunks:
                    chunk.parent_chunk_id = parent_chunks[header_level - 1]
                
                chunks.append(chunk)
                parent_chunks[header_level] = chunk.chunk_id
                chunk_index += 1
        
        # Update child relationships
        self._update_child_relationships(chunks)
        
        logger.info(f"Hierarchical chunking produced {len(chunks)} chunks")
        return chunks
    
    def _create_chunk(self, 
                     content: str, 
                     file_path: str, 
                     chunk_type: str, 
                     chunk_index: int,
                     additional_metadata: Dict[str, Any] = None) -> DocumentChunk:
        """Helper method to create a DocumentChunk with metadata"""
        
        # Extract base metadata
        metadata = self.extract_metadata(content, file_path)
        
        # Add additional metadata if provided
        if additional_metadata:
            # Clean additional metadata to prevent serialization issues
            cleaned_additional = _clean_metadata(additional_metadata)
            metadata.update(cleaned_additional)
        
        # Add chunking-specific metadata
        metadata.update({
            "chunk_method": chunk_type,
            "processing_timestamp": __import__("time").time(),
            "chunk_size_setting": self.chunk_size,
            "chunk_overlap_setting": self.chunk_overlap
        })
        
        # Final cleaning to ensure all metadata is serializable
        metadata = _clean_metadata(metadata)
        
        return DocumentChunk(
            content=content,
            chunk_id=self.generate_chunk_id(content, chunk_index, chunk_type),
            source_file=file_path,
            chunk_type=chunk_type,
            chunk_index=chunk_index,
            token_count=self.count_tokens(content),
            character_count=len(content),
            metadata=metadata
        )
    
    def _update_child_relationships(self, chunks: List[DocumentChunk]):
        """Update child chunk relationships in hierarchical chunks"""
        # Create mapping of parent to children
        parent_to_children = {}
        for chunk in chunks:
            if chunk.parent_chunk_id:
                if chunk.parent_chunk_id not in parent_to_children:
                    parent_to_children[chunk.parent_chunk_id] = []
                parent_to_children[chunk.parent_chunk_id].append(chunk.chunk_id)
        
        # Update child_chunk_ids in parent chunks
        for chunk in chunks:
            if chunk.chunk_id in parent_to_children:
                chunk.child_chunk_ids = parent_to_children[chunk.chunk_id]
    
    def process_document(self, 
                        file_path: str, 
                        chunking_strategies: List[str] = None) -> Dict[str, List[DocumentChunk]]:
        """
        Process a document using specified chunking strategies
        
        Args:
            file_path: Path to the document to process
            chunking_strategies: List of strategies to use ['semantic', 'recursive', 'hierarchical']
        
        Returns:
            Dictionary mapping strategy name to list of chunks
        """
        if chunking_strategies is None:
            chunking_strategies = ['semantic', 'recursive', 'hierarchical']
        
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Document not found: {file_path}")
        
        # Read document content
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        logger.info(f"Processing document: {file_path}")
        logger.info(f"Document length: {len(content)} characters, {self.count_tokens(content)} tokens")
        
        results = {}
        
        # Apply each chunking strategy
        for strategy in chunking_strategies:
            logger.info(f"Applying {strategy} chunking strategy")
            
            if strategy == 'semantic':
                chunks = self.semantic_chunking(content, file_path)
            elif strategy == 'recursive':
                chunks = self.recursive_chunking(content, file_path)
            elif strategy == 'hierarchical':
                chunks = self.hierarchical_chunking(content, file_path)
            else:
                logger.warning(f"Unknown chunking strategy: {strategy}")
                continue
            
            results[strategy] = chunks
            
            # Log chunk statistics
            total_tokens = sum(chunk.token_count for chunk in chunks)
            avg_tokens = total_tokens / len(chunks) if chunks else 0
            logger.info(f"{strategy} strategy: {len(chunks)} chunks, {total_tokens} total tokens, {avg_tokens:.1f} avg tokens/chunk")
        
        return results
    
    def save_chunks(self, chunks_dict: Dict[str, List[DocumentChunk]], output_dir: str):
        """Save processed chunks to JSON files"""
        os.makedirs(output_dir, exist_ok=True)
        
        for strategy, chunks in chunks_dict.items():
            output_file = os.path.join(output_dir, f"{strategy}_chunks.json")
            
            # Convert chunks to serializable format
            chunks_data = []
            for chunk in chunks:
                chunk_dict = asdict(chunk)
                chunks_data.append(chunk_dict)
            
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(chunks_data, f, indent=2, ensure_ascii=False)
            
            logger.info(f"Saved {len(chunks)} {strategy} chunks to {output_file}")
    
    def load_chunks(self, input_file: str) -> List[DocumentChunk]:
        """Load chunks from JSON file"""
        with open(input_file, 'r', encoding='utf-8') as f:
            chunks_data = json.load(f)
        
        chunks = []
        for chunk_dict in chunks_data:
            chunk = DocumentChunk(**chunk_dict)
            chunks.append(chunk)
        
        logger.info(f"Loaded {len(chunks)} chunks from {input_file}")
        return chunks


def main():
    """Example usage of the document processor"""
    processor = DocumentProcessor(
        chunk_size=1000,
        chunk_overlap=200,
        min_chunk_size=100,
        max_chunk_size=10000
    )
    
    # Process the user guide
    input_file = "../../data/infraon_user_guide.md"
    output_dir = "src/knowledgeBase/agent/rag/processed_chunks"
    
    try:
        # Process with all strategies
        results = processor.process_document(
            file_path=input_file,
            chunking_strategies=['semantic', 'recursive', 'hierarchical']
        )
        
        # Save results
        processor.save_chunks(results, output_dir)
        
        # Print summary statistics
        print("\n=== Document Processing Summary ===")
        for strategy, chunks in results.items():
            total_tokens = sum(chunk.token_count for chunk in chunks)
            avg_tokens = total_tokens / len(chunks) if chunks else 0
            print(f"{strategy.upper()}: {len(chunks)} chunks, {total_tokens} tokens, {avg_tokens:.1f} avg tokens/chunk")
        
    except Exception as e:
        logger.error(f"Error processing document: {e}")
        raise


if __name__ == "__main__":
    main() 