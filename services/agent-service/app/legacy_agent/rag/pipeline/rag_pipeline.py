#!/usr/bin/env python3
"""
Complete RAG Pipeline for ITIL Knowledge Base

Integrates:
- MultiStageRetriever (upgraded with 10K context, Faiss, cross-encoder)
- LLM Client (DeepSeek R1 via OpenRouter)
- End-to-end question answering

Usage:
    from rag_pipeline import RAGPipeline
    
    rag = RAGPipeline()
    answer = await rag.ask("How do I create an incident ticket?")
    print(answer)
"""

import asyncio
import logging
import sys
from pathlib import Path
from typing import Dict, Any, Optional, List
from datetime import datetime
import os

# Add parent directories to sys.path for module imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..')) # Adds legacy/rag
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..')) # Adds legacy

from core.retriever import MultiStageRetriever, RetrievalResponse
from core.query_processor import ProcessedQuery
from llm_client import LLMClient

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RAGPipeline:
    """
    Complete RAG Pipeline for ITIL Knowledge Base
    
    Features:
    - Intelligent question processing and retrieval
    - 10K token context window for comprehensive answers
    - Advanced cross-encoder reranking
    - DeepSeek R1 generation with rich context
    """
    
    def __init__(self, 
                 agent_id: str = "agent-002",  # DeepSeek R1
                 vector_db_path: str = "legacy/rag/storage/vector_storage/",
                 processed_chunks_path: str = "legacy/rag/storage/processed_chunks/",
                 max_context_tokens: int = 10000):
        """
        Initialize the RAG pipeline
        
        Args:
            agent_id: LLM agent ID (agent-002 = DeepSeek R1)
            vector_db_path: Path to vector database
            processed_chunks_path: Path to processed chunks
            max_context_tokens: Maximum context tokens for LLM (10K)
        """
        self.agent_id = agent_id
        self.max_context_tokens = max_context_tokens
        
        # Initialize components
        logger.info("Initializing RAG Pipeline components...")
        
        try:
            # Initialize retriever with 10K context support
            self.retriever = MultiStageRetriever(
                vector_db_path=vector_db_path,
                processed_chunks_path=processed_chunks_path,
                context_window_size=max_context_tokens,
                max_initial_results=50,      # More initial results
                max_reranked_results=15,     # More for reranking  
                max_final_results=8          # More final results for 10K context
            )
            logger.info("✅ MultiStageRetriever initialized")
            
            # Initialize LLM client
            self.llm_client = LLMClient()
            logger.info("✅ LLM Client initialized")
            
            # Verify agent configuration
            if agent_id not in self.llm_client.agent_map:
                raise ValueError(f"Agent {agent_id} not found in configuration")
            
            agent_info = self.llm_client.agent_map[agent_id]
            logger.info(f"✅ Using {agent_info['agent_name']} ({agent_info['model_id']})")
            
            # Pipeline statistics
            self.stats = {
                'total_queries': 0,
                'avg_retrieval_time': 0,
                'avg_generation_time': 0,
                'avg_total_time': 0
            }
            
            logger.info("🚀 RAG Pipeline ready!")
            
        except Exception as e:
            logger.error(f"Failed to initialize RAG Pipeline: {e}")
            raise
    
    async def ask(self, question: str, **kwargs) -> Dict[str, Any]:
        """
        Ask a question and get a comprehensive answer
        
        Args:
            question: User question
            **kwargs: Additional parameters
            
        Returns:
            Dictionary with answer, sources, and metadata
        """
        start_time = datetime.now()
        
        try:
            logger.info(f"🤔 Processing question: {question[:100]}...")
            
            # Stage 1: Retrieve relevant context
            retrieval_start = datetime.now()
            retrieval_response = await self.retriever.retrieve(question, **kwargs)
            retrieval_time = (datetime.now() - retrieval_start).total_seconds()
            
            logger.info(f"📚 Retrieved {len(retrieval_response.results)} relevant chunks")
            logger.info(f"📝 Context length: ~{len(retrieval_response.fused_context)} chars")
            
            # Stage 2: Generate answer with LLM
            generation_start = datetime.now()
            answer = await self._generate_answer(question, retrieval_response)
            generation_time = (datetime.now() - generation_start).total_seconds()
            
            total_time = (datetime.now() - start_time).total_seconds()
            
            # Update statistics
            self._update_stats(retrieval_time, generation_time, total_time)
            
            # Prepare response
            response = {
                'question': question,
                'answer': answer,
                'sources': self._format_sources(retrieval_response.results),
                'context_summary': {
                    'num_sources': len(retrieval_response.results),
                    'context_length_chars': len(retrieval_response.fused_context),
                    'estimated_tokens': len(retrieval_response.fused_context.split()) * 1.3
                },
                'performance': {
                    'retrieval_time': retrieval_time,
                    'generation_time': generation_time,
                    'total_time': total_time
                },
                'timestamp': datetime.now().isoformat()
            }
            
            logger.info(f"✅ Answer generated in {total_time:.2f}s")
            return response
            
        except Exception as e:
            logger.error(f"❌ RAG pipeline failed: {e}")
            return {
                'question': question,
                'answer': f"I apologize, but I encountered an error while processing your question: {str(e)}",
                'sources': [],
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    async def _generate_answer(self, question: str, retrieval_response: RetrievalResponse) -> str:
        """Generate answer using LLM with retrieved context"""
        
        # Build comprehensive system prompt for ITIL domain
        system_prompt = self._build_system_prompt()
        
        # Build user prompt with question and context
        user_prompt = self._build_user_prompt(question, retrieval_response)
        
        # Log context usage
        estimated_tokens = len(user_prompt.split()) * 1.3
        logger.info(f"🧠 Generating answer with ~{estimated_tokens:.0f} tokens context")
        
        try:
            # Generate answer with DeepSeek R1
            answer = self.llm_client.send_prompt(
                agent_id=self.agent_id,
                prompt=user_prompt,
                system_prompt=system_prompt
            )
            
            return answer.strip()
            
        except Exception as e:
            logger.error(f"LLM generation failed: {e}")
            raise
    
    def _build_system_prompt(self) -> str:
        """Build system prompt for ITIL domain expertise"""
        return """You are an expert ITIL (Information Technology Infrastructure Library) consultant and technical documentation specialist. Your role is to provide comprehensive, accurate, and actionable answers about IT service management processes, procedures, and best practices.

Key Guidelines:
1. **Accuracy**: Base your answers strictly on the provided context from the Infraon ITIL documentation
2. **Comprehensiveness**: Utilize the full context provided (up to 10,000 tokens) to give detailed, complete answers
3. **Structure**: Organize responses with clear headings, steps, and bullet points for easy understanding
4. **Practicality**: Focus on actionable guidance that users can immediately implement
5. **ITIL Terminology**: Use proper ITIL terminology and explain technical concepts when necessary
6. **Citations**: Reference specific sections or procedures when applicable

Domain Expertise:
- Incident Management
- Problem Management  
- Change Management
- Service Request Management
- Configuration Management Database (CMDB)
- Knowledge Management
- Service Catalog Management
- IT Asset Management

If the provided context doesn't contain sufficient information to answer a question completely, clearly state what information is available and what might be missing."""

    def _build_user_prompt(self, question: str, retrieval_response: RetrievalResponse) -> str:
        """Build user prompt with question and retrieved context"""
        
        prompt_parts = [
            f"Question: {question}",
            "",
            "Relevant Documentation Context:",
            "=" * 50,
            retrieval_response.fused_context,
            "=" * 50,
            "",
            "Please provide a comprehensive answer based on the documentation context above. Include specific steps, procedures, and best practices where applicable."
        ]
        
        return "\n".join(prompt_parts)
    
    def _format_sources(self, results: List[Any]) -> List[Dict[str, Any]]:
        """Format retrieval results as source references"""
        sources = []
        
        for i, result in enumerate(results):
            source = {
                'rank': i + 1,
                'chunk_id': result.chunk_id,
                'relevance_score': round(result.final_score, 3),
                'content_preview': result.content[:200] + "..." if len(result.content) > 200 else result.content,
                'metadata': result.metadata
            }
            sources.append(source)
        
        return sources
    
    def _update_stats(self, retrieval_time: float, generation_time: float, total_time: float):
        """Update pipeline performance statistics"""
        self.stats['total_queries'] += 1
        
        # Running averages
        n = self.stats['total_queries']
        self.stats['avg_retrieval_time'] = ((n-1) * self.stats['avg_retrieval_time'] + retrieval_time) / n
        self.stats['avg_generation_time'] = ((n-1) * self.stats['avg_generation_time'] + generation_time) / n
        self.stats['avg_total_time'] = ((n-1) * self.stats['avg_total_time'] + total_time) / n
    
    def get_stats(self) -> Dict[str, Any]:
        """Get pipeline performance statistics"""
        return self.stats.copy()
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check on all components"""
        health = {
            'timestamp': datetime.now().isoformat(),
            'status': 'healthy',
            'components': {}
        }
        
        try:
            # Check retriever
            health['components']['retriever'] = {
                'status': 'healthy' if self.retriever else 'error',
                'context_window': self.retriever.context_window_size if self.retriever else None
            }
            
            # Check LLM client
            agent_info = self.llm_client.agent_map.get(self.agent_id, {})
            health['components']['llm_client'] = {
                'status': 'healthy',
                'agent_id': self.agent_id,
                'model': agent_info.get('model_id', 'unknown'),
                'agent_name': agent_info.get('agent_name', 'unknown')
            }
            
            # Overall statistics
            health['statistics'] = self.get_stats()
            
        except Exception as e:
            health['status'] = 'error'
            health['error'] = str(e)
        
        return health

# CLI Interface for testing
async def main():
    """Interactive CLI for testing the RAG pipeline"""
    print("🚀 ITIL RAG Pipeline - Interactive Mode")
    print("=" * 50)
    
    try:
        # Initialize pipeline
        rag = RAGPipeline()
        
        # Health check
        health = await rag.health_check()
        print(f"Health Status: {health['status']}")
        print(f"Model: {health['components']['llm_client']['model']}")
        print(f"Context Window: {health['components']['retriever']['context_window']} tokens")
        print("=" * 50)
        
        # Interactive loop
        while True:
            try:
                question = input("\n🤔 Ask a question (or 'quit' to exit): ").strip()
                
                if question.lower() in ['quit', 'exit', 'q']:
                    break
                
                if not question:
                    continue
                
                print("\n🔍 Processing...")
                response = await rag.ask(question)
                
                print(f"\n📝 **Answer:**")
                print(response['answer'])
                
                print(f"\n📊 **Sources Used:** {response['context_summary']['num_sources']}")
                print(f"⏱️  **Response Time:** {response['performance']['total_time']:.2f}s")
                
                # Show sources if requested
                show_sources = input("\nShow sources? (y/N): ").strip().lower()
                if show_sources in ['y', 'yes']:
                    print("\n📚 **Sources:**")
                    for source in response['sources']:
                        print(f"{source['rank']}. Score: {source['relevance_score']} - {source['content_preview']}")
                
            except KeyboardInterrupt:
                break
            except Exception as e:
                print(f"❌ Error: {e}")
        
        # Final statistics
        stats = rag.get_stats()
        if stats['total_queries'] > 0:
            print(f"\n📈 **Session Statistics:**")
            print(f"Total Queries: {stats['total_queries']}")
            print(f"Avg Response Time: {stats['avg_total_time']:.2f}s")
        
        print("\n👋 Goodbye!")
        
    except Exception as e:
        print(f"❌ Failed to initialize RAG pipeline: {e}")
        return 1

if __name__ == "__main__":
    asyncio.run(main()) 