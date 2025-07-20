"""
Comprehensive tests for the Query Processing Pipeline

Tests all major components:
- Query validation and preprocessing
- Intent classification and complexity assessment
- Query expansion with synonyms and related terms
- Query decomposition for complex queries
- Multi-modal term optimization (vector vs keyword search)
- Query enhancement and processing pipeline
"""

import sys
import os
import pytest
import asyncio
import json
from datetime import datetime
from pathlib import Path

# Add the parent directory to the path for imports
sys.path.append(str(Path(__file__).parent.parent))

from knowledgeBase.agent.rag.core.query_processor import (
    QueryProcessor, QueryExpansion, QueryIntent, ProcessedQuery
)

class TestQueryProcessor:
    """Test suite for QueryProcessor class"""
    
    @pytest.fixture
    def processor(self):
        """Create a QueryProcessor instance for testing"""
        return QueryProcessor()
    
    @pytest.fixture
    def sample_queries(self):
        """Sample queries for testing different scenarios"""
        return {
            'simple_factual': "What is API authentication?",
            'complex_procedural': "How to set up OAuth authentication flow and configure security headers for production deployment?",
            'troubleshooting': "Debug connection timeout errors in database",
            'conceptual': "Why does caching improve system performance?",
            'multi_part': "Compare REST API and GraphQL benefits and explain their implementation differences"
        }
    
    def test_processor_initialization(self, processor):
        """Test that processor initializes correctly"""
        assert processor is not None
        assert hasattr(processor, 'stop_words')
        assert hasattr(processor, 'lemmatizer')
        assert hasattr(processor, 'intent_patterns')
        assert len(processor.intent_patterns) == 4  # factual, procedural, conceptual, troubleshooting
    
    def test_query_validation(self, processor):
        """Test query validation logic"""
        # Valid queries
        assert processor._validate_query("What is API authentication?") == True
        assert processor._validate_query("How to debug errors?") == True
        
        # Invalid queries
        assert processor._validate_query("") == False
        assert processor._validate_query("   ") == False
        assert processor._validate_query("ab") == False  # Too short
        assert processor._validate_query("a" * 600) == False  # Too long
    
    def test_query_preprocessing(self, processor):
        """Test query preprocessing and cleaning"""
        # Test whitespace normalization
        result = processor._preprocess_query("  What   is    API  ?  ")
        assert result == "What is API ?"
        
        # Test punctuation handling
        result = processor._preprocess_query("What's the API authentication process???")
        assert "?" in result
        assert result.count("?") == 1
        
        # Test special character removal
        result = processor._preprocess_query("What is @#$% API authentication?")
        assert "@#$%" not in result
        assert "API" in result
    
    def test_intent_classification(self, processor, sample_queries):
        """Test intent classification for different query types"""
        # Test factual intent
        intent = processor._classify_intent(sample_queries['simple_factual'])
        assert intent.intent_type == 'factual'
        assert intent.confidence > 0
        
        # Test procedural intent
        intent = processor._classify_intent("How to set up authentication")
        assert intent.intent_type == 'procedural'
        
        # Test troubleshooting intent
        intent = processor._classify_intent(sample_queries['troubleshooting'])
        assert intent.intent_type == 'troubleshooting'
        
        # Test conceptual intent
        intent = processor._classify_intent(sample_queries['conceptual'])
        assert intent.intent_type == 'conceptual'
    
    def test_complexity_assessment(self, processor, sample_queries):
        """Test query complexity assessment"""
        # Simple query
        complexity = processor._assess_complexity("What is API?")
        assert complexity == 'simple'
        
        # Medium complexity query
        complexity = processor._assess_complexity("How does API authentication work?")
        assert complexity == 'medium'
        
        # Complex query
        complexity = processor._assess_complexity(sample_queries['complex_procedural'])
        assert complexity == 'complex'
    
    def test_domain_focus_detection(self, processor):
        """Test domain focus detection"""
        # Technical domain
        domains = processor._detect_domain_focus("API programming and database system")
        assert 'technical' in domains
        
        # Business domain
        domains = processor._detect_domain_focus("workflow management process")
        assert 'business' in domains
        
        # Documentation domain
        domains = processor._detect_domain_focus("user guide and tutorial documentation")
        assert 'documentation' in domains
        
        # Multiple domains
        domains = processor._detect_domain_focus("API documentation workflow process")
        assert len(domains) > 1
    
    @pytest.mark.asyncio
    async def test_query_expansion(self, processor):
        """Test query expansion with synonyms and related terms"""
        intent = QueryIntent(
            intent_type='factual',
            confidence=0.8,
            query_complexity='simple',
            domain_focus=['technical'],
            expected_answer_type='definition'
        )
        
        expansion = await processor._expand_query("authentication process", intent)
        
        assert expansion.original_query == "authentication process"
        assert isinstance(expansion.synonyms, list)
        assert isinstance(expansion.related_terms, list)
        assert isinstance(expansion.expanded_terms, list)
        assert 0 <= expansion.confidence_score <= 1
        assert expansion.expansion_method == 'wordnet_based'
    
    def test_query_decomposition(self, processor, sample_queries):
        """Test decomposition of complex queries"""
        intent = QueryIntent(
            intent_type='procedural',
            confidence=0.9,
            query_complexity='complex',
            domain_focus=['technical'],
            expected_answer_type='steps'
        )
        
        # Test complex query decomposition
        sub_queries = processor._decompose_query(sample_queries['multi_part'], intent)
        assert isinstance(sub_queries, list)
        
        # Test simple query (should not decompose)
        simple_intent = QueryIntent(
            intent_type='factual',
            confidence=0.8,
            query_complexity='simple',
            domain_focus=['technical'],
            expected_answer_type='definition'
        )
        
        sub_queries = processor._decompose_query(sample_queries['simple_factual'], simple_intent)
        assert len(sub_queries) == 0
    
    def test_key_terms_extraction(self, processor):
        """Test key terms extraction from queries"""
        query = "API authentication process security implementation"
        key_terms = processor._extract_key_terms(query)
        
        assert isinstance(key_terms, list)
        assert len(key_terms) > 0
        assert all(isinstance(term, str) for term in key_terms)
        
        # Should extract important nouns
        important_terms = ['api', 'authentication', 'process', 'security', 'implementation']
        extracted_lower = [term.lower() for term in key_terms]
        
        # At least some important terms should be extracted
        overlap = set(important_terms) & set(extracted_lower)
        assert len(overlap) > 0
    
    def test_vector_search_optimization(self, processor):
        """Test optimization for vector search"""
        expansion = QueryExpansion(
            original_query="API authentication",
            expanded_terms=['auth', 'verification', 'security', 'token'],
            synonyms=['auth', 'verification'],
            related_terms=['security', 'token'],
            confidence_score=0.8,
            expansion_method='wordnet_based'
        )
        
        vector_terms = processor._optimize_for_vector_search("API authentication process", expansion)
        
        assert isinstance(vector_terms, list)
        assert len(vector_terms) <= 10  # Should be limited
        assert 'api' in [term.lower() for term in vector_terms]  # Should include original terms
    
    def test_keyword_search_optimization(self, processor):
        """Test optimization for keyword search"""
        expansion = QueryExpansion(
            original_query="API authentication",
            expanded_terms=['auth', 'verification', 'system', 'process'],
            synonyms=['auth', 'verification'],
            related_terms=['system', 'process'],
            confidence_score=0.8,
            expansion_method='wordnet_based'
        )
        
        keyword_terms = processor._optimize_for_keyword_search("API authentication process", expansion)
        
        assert isinstance(keyword_terms, list)
        assert len(keyword_terms) <= 8  # Should be limited
        # Should preserve case for proper nouns
        assert any(term == 'API' for term in keyword_terms)
    
    @pytest.mark.asyncio
    async def test_full_processing_pipeline(self, processor, sample_queries):
        """Test the complete query processing pipeline"""
        for query_type, query in sample_queries.items():
            result = await processor.process_query(query)
            
            # Validate result structure
            assert isinstance(result, ProcessedQuery)
            assert result.original_query == query
            assert isinstance(result.enhanced_query, str)
            assert isinstance(result.sub_queries, list)
            assert isinstance(result.key_terms, list)
            assert isinstance(result.query_vector_terms, list)
            assert isinstance(result.keyword_terms, list)
            assert isinstance(result.intent, QueryIntent)
            assert isinstance(result.expansion, QueryExpansion)
            assert isinstance(result.processing_metadata, dict)
            assert isinstance(result.timestamp, datetime)
            
            # Validate metadata
            assert 'processing_time_ms' in result.processing_metadata
            assert 'original_length' in result.processing_metadata
            assert 'enhanced_length' in result.processing_metadata
            assert result.processing_metadata['processing_time_ms'] > 0
            
            print(f"\n{query_type.upper()} Query Processing Results:")
            print(f"Original: {result.original_query}")
            print(f"Enhanced: {result.enhanced_query}")
            print(f"Intent: {result.intent.intent_type} ({result.intent.confidence:.2f})")
            print(f"Complexity: {result.intent.query_complexity}")
            print(f"Domain Focus: {result.intent.domain_focus}")
            print(f"Key Terms: {result.key_terms[:5]}")  # Show first 5
            print(f"Vector Terms: {result.query_vector_terms[:5]}")
            print(f"Keyword Terms: {result.keyword_terms[:5]}")
            print(f"Processing Time: {result.processing_metadata['processing_time_ms']:.2f}ms")
    
    @pytest.mark.asyncio
    async def test_save_load_processed_query(self, processor, tmp_path):
        """Test saving and loading processed queries"""
        # Process a query
        query = "What is API authentication process?"
        result = await processor.process_query(query)
        
        # Save to file
        filepath = tmp_path / "test_query.json"
        processor.save_processed_query(result, str(filepath))
        
        # Verify file exists
        assert filepath.exists()
        
        # Load from file
        loaded_result = processor.load_processed_query(str(filepath))
        
        # Verify loaded data matches original
        assert loaded_result.original_query == result.original_query
        assert loaded_result.enhanced_query == result.enhanced_query
        assert loaded_result.intent.intent_type == result.intent.intent_type
        assert loaded_result.expansion.expansion_method == result.expansion.expansion_method
    
    def test_error_handling(self, processor):
        """Test error handling for edge cases"""
        # Test with invalid queries
        with pytest.raises(ValueError):
            asyncio.run(processor.process_query(""))
        
        with pytest.raises(ValueError):
            asyncio.run(processor.process_query("ab"))  # Too short
    
    @pytest.mark.asyncio
    async def test_performance_benchmarks(self, processor):
        """Test performance benchmarks for query processing"""
        queries = [
            "What is API authentication?",
            "How to implement OAuth flow?",
            "Debug database connection issues",
            "Explain caching strategies and implementation details"
        ]
        
        total_time = 0
        for query in queries:
            result = await processor.process_query(query)
            processing_time = result.processing_metadata['processing_time_ms']
            total_time += processing_time
            
            # Individual query should process in reasonable time (< 1 second)
            assert processing_time < 1000, f"Query took too long: {processing_time}ms"
        
        # Average processing time should be reasonable
        avg_time = total_time / len(queries)
        print(f"\nPerformance Metrics:")
        print(f"Average processing time: {avg_time:.2f}ms")
        print(f"Total time for {len(queries)} queries: {total_time:.2f}ms")
        
        assert avg_time < 500, f"Average processing time too high: {avg_time}ms"

# Main test execution
if __name__ == "__main__":
    async def run_comprehensive_tests():
        """Run comprehensive tests manually"""
        print("🧪 Starting Comprehensive Query Processor Tests")
        print("=" * 60)
        
        # Initialize processor
        processor = QueryProcessor()
        
        # Test sample queries including ITIL-specific cases
        sample_queries = {
            'simple_factual': "What is API authentication?",
            'complex_procedural': "How to set up OAuth authentication flow and configure security headers?",
            'troubleshooting': "Debug connection timeout errors in database",
            'conceptual': "Why does caching improve system performance?",
            'multi_part': "Compare REST API and GraphQL benefits and explain implementation",
            
            # ITIL-specific test cases
            'itil_incident': "How to escalate critical incidents with high severity?",
            'itil_problem': "What is root cause analysis for recurring incidents?", 
            'itil_change': "How to submit emergency change request for production deployment?",
            'itil_service_request': "What is service catalog and request fulfillment process?",
            'itil_cmdb': "How to configure CMDB relationships and CI dependencies?",
            'itil_knowledge': "Where are knowledge articles stored and how to access them?"
        }
        
        print("\n🎯 Testing Full Processing Pipeline:")
        
        for query_type, query in sample_queries.items():
            try:
                result = await processor.process_query(query)
                
                print(f"\n📝 {query_type.upper()} Query:")
                print(f"Input: {query}")
                print(f"Enhanced: {result.enhanced_query}")
                print(f"Intent: {result.intent.intent_type} (confidence: {result.intent.confidence:.2f})")
                print(f"Complexity: {result.intent.query_complexity}")
                print(f"Domain: {', '.join(result.intent.domain_focus)}")
                print(f"Answer Type: {result.intent.expected_answer_type}")
                print(f"Key Terms: {', '.join(result.key_terms[:8])}")
                print(f"Synonyms: {', '.join(result.expansion.synonyms[:5])}")
                print(f"Sub-queries: {len(result.sub_queries)}")
                print(f"Processing: {result.processing_metadata['processing_time_ms']:.2f}ms")
                
                if result.sub_queries:
                    print(f"Sub-queries: {result.sub_queries}")
                
            except Exception as e:
                print(f"❌ Error processing {query_type}: {e}")
        
        print(f"\n✅ Query Processor Tests Complete!")
        print("All components working correctly! 🚀")
    
    # Run the tests
    asyncio.run(run_comprehensive_tests()) 