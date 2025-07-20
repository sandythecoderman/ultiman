"""
Test Multi-Stage Retrieval System
Tests the complete retrieval pipeline implementation
"""

import asyncio
import time
import json
from pathlib import Path
from knowledgeBase.agent.rag.core.retriever import MultiStageRetriever

async def test_multistage_retrieval():
    """Test the complete multi-stage retrieval pipeline"""
    
    print("🔍 Testing Multi-Stage Retrieval System")
    print("=" * 60)
    
    try:
        # Initialize retriever
        print("📥 Initializing retriever...")
        retriever = MultiStageRetriever()
        print("✅ Retriever initialized successfully")
        
        # Test queries covering different ITIL domains
        test_queries = [
            "How to create incident tickets in workspace?",
            "What is the process for change management?", 
            "How to configure CMDB relationships?",
            "Where are knowledge articles stored?",
            "What are the priority levels for incidents?",
            "How does escalation work for critical issues?",
            "What is root cause analysis process?",
            "How to track service requests?",
            "What is the approval workflow?",
            "How to manage software assets?"
        ]
        
        print(f"\n🎯 Testing {len(test_queries)} queries:")
        print("-" * 60)
        
        all_results = []
        total_time = 0
        
        for i, query in enumerate(test_queries, 1):
            start_time = time.time()
            
            try:
                print(f"\n📝 Query {i}: {query}")
                
                # Perform retrieval
                response = await retriever.retrieve(query)
                
                query_time = (time.time() - start_time) * 1000
                total_time += query_time
                
                # Display results
                print(f"⏱️  Processing time: {response.processing_time_ms:.1f}ms")
                print(f"📊 Results found: {len(response.results)}")
                
                # Show retrieval metadata
                metadata = response.retrieval_metadata
                print(f"🔍 Initial results: {metadata['initial_results_count']}")
                print(f"🔄 Reranked results: {metadata['reranked_results_count']}")
                print(f"✅ Final results: {metadata['final_results_count']}")
                
                # Show top results with scores
                print("🏆 Top Results:")
                for j, result in enumerate(response.results[:3], 1):
                    print(f"  {j}. Score: {result.final_score:.3f} "
                          f"(Dense: {result.dense_score:.3f}, "
                          f"Sparse: {result.sparse_score:.3f}, "
                          f"Rerank: {result.rerank_score:.3f})")
                    
                    # Show snippet of content
                    content_snippet = result.content[:100] + "..." if len(result.content) > 100 else result.content
                    print(f"     Content: {content_snippet}")
                
                # Show context info
                context_length = len(response.fused_context)
                context_words = len(response.fused_context.split())
                print(f"📄 Fused context: {context_length} chars, ~{context_words} words")
                
                # Store results for analysis
                all_results.append({
                    'query': query,
                    'processing_time': response.processing_time_ms,
                    'num_results': len(response.results),
                    'avg_score': sum(r.final_score for r in response.results) / len(response.results) if response.results else 0,
                    'context_length': context_length
                })
                
            except Exception as e:
                print(f"❌ Error processing query {i}: {str(e)}")
                continue
        
        # Overall analysis
        print(f"\n📊 Overall Analysis:")
        print("=" * 60)
        
        if all_results:
            avg_time = total_time / len(all_results)
            avg_results = sum(r['num_results'] for r in all_results) / len(all_results)
            avg_score = sum(r['avg_score'] for r in all_results) / len(all_results)
            avg_context = sum(r['context_length'] for r in all_results) / len(all_results)
            
            print(f"Total queries processed: {len(all_results)}")
            print(f"Average processing time: {avg_time:.1f}ms")
            print(f"Average results per query: {avg_results:.1f}")
            print(f"Average result score: {avg_score:.3f}")
            print(f"Average context length: {avg_context:.0f} chars")
            
            # Performance categories
            fast_queries = len([r for r in all_results if r['processing_time'] < 100])
            medium_queries = len([r for r in all_results if 100 <= r['processing_time'] < 500])
            slow_queries = len([r for r in all_results if r['processing_time'] >= 500])
            
            print(f"\nPerformance Distribution:")
            print(f"  Fast (<100ms): {fast_queries} ({fast_queries/len(all_results)*100:.1f}%)")
            print(f"  Medium (100-500ms): {medium_queries} ({medium_queries/len(all_results)*100:.1f}%)")
            print(f"  Slow (≥500ms): {slow_queries} ({slow_queries/len(all_results)*100:.1f}%)")
            
            # Quality analysis
            high_quality = len([r for r in all_results if r['avg_score'] >= 0.7])
            medium_quality = len([r for r in all_results if 0.4 <= r['avg_score'] < 0.7])
            low_quality = len([r for r in all_results if r['avg_score'] < 0.4])
            
            print(f"\nResult Quality Distribution:")
            print(f"  High quality (≥0.7): {high_quality} ({high_quality/len(all_results)*100:.1f}%)")
            print(f"  Medium quality (0.4-0.7): {medium_quality} ({medium_quality/len(all_results)*100:.1f}%)")
            print(f"  Low quality (<0.4): {low_quality} ({low_quality/len(all_results)*100:.1f}%)")
        
        # Test retrieval statistics
        stats = retriever.get_retrieval_stats()
        print(f"\nRetrieval Statistics:")
        print(f"  Total queries: {stats['total_queries']}")
        print(f"  Average retrieval time: {stats['avg_retrieval_time']:.1f}ms")
        print(f"  Cache hits: {stats['cache_hits']}")
        
        print(f"\n✅ Multi-Stage Retrieval Testing Complete! 🚀")
        
        return all_results
        
    except Exception as e:
        print(f"❌ Retrieval testing failed: {str(e)}")
        raise

async def test_individual_components():
    """Test individual retrieval components"""
    
    print("\n🔧 Testing Individual Retrieval Components")
    print("=" * 60)
    
    try:
        retriever = MultiStageRetriever()
        
        # Test query processing
        print("🧠 Testing query processing...")
        test_query = "How to escalate critical incidents?"
        processed = await retriever.query_processor.process_query(test_query)
        
        print(f"Original: {processed.original_query}")
        print(f"Enhanced: {processed.enhanced_query}")
        print(f"Intent: {processed.intent.intent_type} (confidence: {processed.intent.confidence:.2f})")
        print(f"Domains: {', '.join(processed.intent.domain_focus)}")
        
        # Test component integration
        print("\n🔗 Testing component integration...")
        
        # Verify vector database connection
        if retriever.vector_db:
            print("✅ Vector database connected")
        else:
            print("❌ Vector database not connected")
        
        # Verify TF-IDF components
        if retriever.tfidf_vectorizer and retriever.tfidf_matrix is not None:
            print("✅ TF-IDF components loaded")
            print(f"   Vocabulary size: {len(retriever.tfidf_vectorizer.vocabulary_)}")
            print(f"   Matrix shape: {retriever.tfidf_matrix.shape}")
        else:
            print("❌ TF-IDF components not loaded")
        
        # Verify chunks metadata
        print(f"✅ Chunks metadata loaded: {len(retriever.chunks_metadata)} chunks")
        
        print("\n✅ Component testing complete!")
        
    except Exception as e:
        print(f"❌ Component testing failed: {str(e)}")
        raise

if __name__ == "__main__":
    async def run_all_tests():
        """Run comprehensive retrieval tests"""
        print("🧪 Starting Comprehensive Retrieval Tests")
        print("=" * 70)
        
        # Test individual components first
        await test_individual_components()
        
        # Test complete retrieval pipeline
        results = await test_multistage_retrieval()
        
        return results
    
    # Run tests
    asyncio.run(run_all_tests()) 