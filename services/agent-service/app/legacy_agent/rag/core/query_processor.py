"""
Advanced Query Processing Pipeline for RAG System

This module implements sophisticated query processing including:
- Query expansion using synonyms and related terms
- Question decomposition for complex queries
- Query rephrasing and reformulation
- Intent classification and query optimization
- Multi-modal query preparation for retrieval
"""

import re
import json
import logging
from typing import List, Dict, Any, Optional, Tuple, Set
from dataclasses import dataclass, asdict
from pathlib import Path
import asyncio
from datetime import datetime

# External imports
import nltk
from nltk.corpus import wordnet, stopwords
from nltk.tokenize import word_tokenize, sent_tokenize
from nltk.stem import WordNetLemmatizer
from nltk.tag import pos_tag
import requests
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class QueryExpansion:
    """Container for query expansion results"""
    original_query: str
    expanded_terms: List[str]
    synonyms: List[str]
    related_terms: List[str]
    confidence_score: float
    expansion_method: str

@dataclass
class QueryIntent:
    """Container for query intent classification"""
    intent_type: str  # 'factual', 'procedural', 'conceptual', 'troubleshooting'
    confidence: float
    query_complexity: str  # 'simple', 'medium', 'complex'
    domain_focus: List[str]  # detected domain areas
    expected_answer_type: str  # 'definition', 'steps', 'explanation', 'solution'

@dataclass
class ProcessedQuery:
    """Container for fully processed query ready for retrieval"""
    original_query: str
    enhanced_query: str
    sub_queries: List[str]
    key_terms: List[str]
    query_vector_terms: List[str]  # optimized for vector search
    keyword_terms: List[str]  # optimized for keyword search
    intent: QueryIntent
    expansion: QueryExpansion
    processing_metadata: Dict[str, Any]
    timestamp: datetime

class QueryProcessor:
    """
    Advanced query processor that enhances user queries for optimal retrieval.
    
    Features:
    - Query expansion with synonyms and related terms
    - Complex query decomposition
    - Intent classification and optimization
    - Multi-modal query preparation
    - Query rephrasing and reformulation
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize query processor with configuration"""
        self.config = config or {}
        
        # Initialize NLTK components
        self._download_nltk_data()
        self.lemmatizer = WordNetLemmatizer()
        self.stop_words = set(stopwords.words('english'))
        
        # Query expansion settings
        self.expansion_limit = self.config.get('expansion_limit', 10)
        self.synonym_threshold = self.config.get('synonym_threshold', 0.7)
        
        # Intent classification patterns
        self._init_intent_patterns()
        
        # Query quality thresholds
        self.min_query_length = self.config.get('min_query_length', 3)
        self.max_query_length = self.config.get('max_query_length', 500)
        
        logger.info("QueryProcessor initialized successfully")
    
    def _download_nltk_data(self):
        """Download required NLTK data"""
        required_data = [
            'punkt', 'wordnet', 'stopwords', 
            'averaged_perceptron_tagger', 'omw-1.4'
        ]
        
        for data in required_data:
            try:
                nltk.download(data, quiet=True)
            except Exception as e:
                logger.warning(f"Failed to download NLTK data '{data}': {e}")
    
    def _init_intent_patterns(self):
        """Initialize patterns for intent classification"""
        self.intent_patterns = {
            'factual': [
                r'\bwhat\s+is\b', r'\bwho\s+is\b', r'\bwhen\s+is\b', r'\bwhere\s+is\b',
                r'\bdefine\b', r'\bexplain\b', r'\bdefinition\s+of\b', r'\bmeaning\s+of\b',
                r'\bwhat\s+are\b', r'\btell\s+me\s+about\b', r'\binformation\s+about\b',
                r'\bwhat\s+does\b.*\bmean\b', r'\bwhat\s+(exactly\s+)?is\b',
                r'\bdescribe\b', r'\blist\b', r'\bshow\s+me\b'
            ],
            'procedural': [
                r'\bhow\s+to\b', r'\bsteps\s+to\b', r'\bprocess\s+(for|of)\b',
                r'\bguide\s+(for|to)\b', r'\btutorial\b', r'\binstructions\b',
                r'\bconfigure\b', r'\bsetup\b', r'\bset\s+up\b', r'\binstall\b',
                r'\bimplement\b', r'\bcreate\b', r'\bbuild\b', r'\bmake\b',
                r'\bhow\s+do\s+i\b', r'\bhow\s+can\s+i\b', r'\bwalkthrough\b'
            ],
            'conceptual': [
                r'\bwhy\s+does\b', r'\bhow\s+does\b', r'\bunderstand\b',
                r'\bconcept\s+of\b', r'\bprinciple\b', r'\btheory\b',
                r'\bwhy\s+is\b', r'\breason\s+for\b', r'\bcause\s+of\b',
                r'\bbenefits?\s+of\b', r'\badvantages?\s+of\b', r'\bpurpose\s+of\b',
                r'\bcompare\b', r'\bdifference\s+between\b', r'\bvs\b'
            ],
            'troubleshooting': [
                r'\berror\b', r'\bproblem\b', r'\bissue\b', r'\bfail(s|ed|ing|ure)?\b',
                r'\bdebug\b', r'\bfix\b', r'\btroubleshoot\b', r'\bresolve\b',
                r'\bnot\s+working\b', r'\bdoesn\'?t\s+work\b', r'\bbroken\b',
                r'\btimeout\b', r'\bcrash\b', r'\bstuck\b', r'\bhangs?\b',
                r'\bconnection\s+(error|problem|issue)\b'
            ]
        }
    
    async def process_query(self, query: str) -> ProcessedQuery:
        """
        Main method to process a user query through the complete pipeline
        
        Args:
            query: Raw user query string
            
        Returns:
            ProcessedQuery object with all processing results
        """
        start_time = datetime.now()
        
        # Validate query
        if not self._validate_query(query):
            raise ValueError(f"Invalid query: {query}")
        
        # Step 1: Basic preprocessing
        cleaned_query = self._preprocess_query(query)
        
        # Step 2: Intent classification
        intent = self._classify_intent(cleaned_query)
        
        # Step 3: Query expansion
        expansion = await self._expand_query(cleaned_query, intent)
        
        # Step 4: Query decomposition (for complex queries)
        sub_queries = self._decompose_query(cleaned_query, intent)
        
        # Step 5: Enhanced query generation
        enhanced_query = self._generate_enhanced_query(
            cleaned_query, expansion, intent
        )
        
        # Step 6: Extract key terms for different search modes
        key_terms = self._extract_key_terms(enhanced_query)
        vector_terms = self._optimize_for_vector_search(enhanced_query, expansion)
        keyword_terms = self._optimize_for_keyword_search(enhanced_query, expansion)
        
        # Step 7: Create processing metadata
        processing_time = (datetime.now() - start_time).total_seconds()
        metadata = {
            'processing_time_ms': processing_time * 1000,
            'original_length': len(query),
            'enhanced_length': len(enhanced_query),
            'expansion_count': len(expansion.expanded_terms),
            'sub_query_count': len(sub_queries),
            'key_term_count': len(key_terms)
        }
        
        return ProcessedQuery(
            original_query=query,
            enhanced_query=enhanced_query,
            sub_queries=sub_queries,
            key_terms=key_terms,
            query_vector_terms=vector_terms,
            keyword_terms=keyword_terms,
            intent=intent,
            expansion=expansion,
            processing_metadata=metadata,
            timestamp=datetime.now()
        )
    
    def _validate_query(self, query: str) -> bool:
        """Validate query meets basic requirements"""
        if not query or not query.strip():
            return False
        
        query_len = len(query.strip())
        if query_len < self.min_query_length or query_len > self.max_query_length:
            return False
        
        # Check for non-ASCII or suspicious content
        if not query.isprintable():
            return False
        
        return True
    
    def _preprocess_query(self, query: str) -> str:
        """Basic query preprocessing and cleaning"""
        # Remove extra whitespace
        query = ' '.join(query.split())
        
        # Normalize case (keep original case for proper nouns detection)
        # Don't lowercase everything yet - we need case info for NER
        
        # Remove unnecessary punctuation but keep meaningful ones
        query = re.sub(r'[^\w\s\-\?\.!]', ' ', query)
        
        # Normalize question marks and exclamations
        query = re.sub(r'\?+', '?', query)
        query = re.sub(r'!+', '!', query)
        
        return query.strip()
    
    def _classify_intent(self, query: str) -> QueryIntent:
        """Classify query intent and complexity"""
        query_lower = query.lower()
        
        # Intent classification using patterns
        intent_scores = {}
        total_matches = 0
        
        for intent_type, patterns in self.intent_patterns.items():
            score = 0
            for pattern in patterns:
                if re.search(pattern, query_lower):
                    score += 1
                    total_matches += 1
            intent_scores[intent_type] = score
        
        # Determine primary intent with better confidence calculation
        if any(intent_scores.values()):
            primary_intent = max(intent_scores.items(), key=lambda x: x[1])[0]
            max_score = intent_scores[primary_intent]
            
            # More realistic confidence: based on pattern matches vs total query content
            # Higher score = higher confidence, but cap at reasonable levels
            if max_score >= 3:
                confidence = 0.9  # Very confident with multiple pattern matches
            elif max_score == 2:
                confidence = 0.7  # Good confidence
            elif max_score == 1:
                confidence = 0.5  # Moderate confidence
            else:
                confidence = 0.3  # Low confidence
                
            # Boost confidence if this intent clearly dominates
            if max_score > 0 and sum(intent_scores.values()) > 0:
                dominance = max_score / sum(intent_scores.values())
                confidence = min(confidence * (1 + dominance), 0.95)
        else:
            primary_intent = 'conceptual'  # Default
            confidence = 0.3
        
        # Assess query complexity
        complexity = self._assess_complexity(query)
        
        # Detect domain focus (simplified - could be enhanced with NER)
        domain_focus = self._detect_domain_focus(query)
        
        # Determine expected answer type
        answer_type = self._determine_answer_type(query, primary_intent)
        
        return QueryIntent(
            intent_type=primary_intent,
            confidence=min(confidence, 1.0),
            query_complexity=complexity,
            domain_focus=domain_focus,
            expected_answer_type=answer_type
        )
    
    def _assess_complexity(self, query: str) -> str:
        """Assess query complexity based on various factors"""
        words = word_tokenize(query.lower())
        
        # Simple heuristics for complexity assessment
        word_count = len(words)
        unique_words = len(set(words))
        
        # Check for complex indicators
        complex_indicators = [
            'and', 'or', 'but', 'however', 'although', 'because',
            'when', 'where', 'why', 'how', 'compare', 'difference'
        ]
        complex_count = sum(1 for word in words if word in complex_indicators)
        
        # Assess complexity
        if word_count <= 5 and complex_count == 0:
            return 'simple'
        elif word_count <= 15 and complex_count <= 2:
            return 'medium'
        else:
            return 'complex'
    
    def _detect_domain_focus(self, query: str) -> List[str]:
        """Detect domain/topic focus areas in the query with ITIL-specific enhancement"""
        # Enhanced domain keywords for ITIL platform
        domain_keywords = {
            'itil_incident': [
                'incident', 'ticket', 'outage', 'service interruption', 'downtime',
                'severity', 'urgency', 'priority', 'escalation', 'sla', 'response time'
            ],
            'itil_problem': [
                'problem', 'root cause', 'known error', 'workaround', 'permanent fix',
                'problem analysis', 'trend analysis', 'recurring incident'
            ],
            'itil_change': [
                'change', 'release', 'deployment', 'change advisory board', 'cab',
                'change request', 'emergency change', 'standard change', 'rollback',
                'implementation', 'risk assessment'
            ],
            'itil_request': [
                'service request', 'request fulfillment', 'catalog', 'service catalog',
                'fulfillment', 'request type', 'approval', 'workflow'
            ],
            'itil_cmdb': [
                'cmdb', 'configuration item', 'ci', 'asset', 'configuration management',
                'baseline', 'relationship', 'dependency', 'inventory', 'discovery'
            ],
            'itil_knowledge': [
                'knowledge base', 'kb', 'knowledge article', 'faq', 'documentation',
                'best practice', 'procedure', 'guideline', 'solution'
            ],
            'itil_service': [
                'service management', 'service level', 'service availability',
                'service continuity', 'service desk', 'itsm', 'service delivery'
            ],
            'technical': [
                'api', 'code', 'programming', 'software', 'system', 'database',
                'authentication', 'authorization', 'integration', 'configuration'
            ],
            'business': [
                'workflow', 'process', 'management', 'organization', 'department',
                'business impact', 'business service', 'customer'
            ],
            'compliance': [
                'compliance', 'audit', 'governance', 'policy', 'standard',
                'regulation', 'security', 'risk management'
            ],
            'troubleshooting': [
                'error', 'problem', 'issue', 'bug', 'fix', 'debug', 'timeout',
                'connection', 'failure', 'diagnostic'
            ]
        }
        
        query_lower = query.lower()
        detected_domains = []
        
        for domain, keywords in domain_keywords.items():
            if any(keyword in query_lower for keyword in keywords):
                detected_domains.append(domain)
        
        return detected_domains or ['general']
    
    def _determine_answer_type(self, query: str, intent: str) -> str:
        """Determine expected answer type based on query and intent"""
        query_lower = query.lower()
        
        if intent == 'factual':
            if any(word in query_lower for word in ['what is', 'define', 'meaning']):
                return 'definition'
            else:
                return 'explanation'
        elif intent == 'procedural':
            return 'steps'
        elif intent == 'troubleshooting':
            return 'solution'
        else:
            return 'explanation'
    
    async def _expand_query(self, query: str, intent: QueryIntent) -> QueryExpansion:
        """Expand query with synonyms and related terms"""
        words = word_tokenize(query.lower())
        
        # Remove stopwords for expansion
        content_words = [word for word in words if word not in self.stop_words and len(word) > 2]
        
        # Get synonyms using WordNet
        synonyms = []
        related_terms = []
        
        for word in content_words:
            word_synonyms = self._get_wordnet_synonyms(word)
            synonyms.extend(word_synonyms)
            
            # Get related terms (hypernyms, hyponyms)
            word_related = self._get_related_terms(word)
            related_terms.extend(word_related)
        
        # Remove duplicates and original words
        synonyms = list(set(synonyms) - set(words))[:self.expansion_limit]
        related_terms = list(set(related_terms) - set(words) - set(synonyms))[:self.expansion_limit]
        
        # Combine all expanded terms
        expanded_terms = synonyms + related_terms
        
        # Calculate confidence score based on expansion quality
        confidence = min(len(expanded_terms) / max(len(content_words), 1), 1.0)
        
        return QueryExpansion(
            original_query=query,
            expanded_terms=expanded_terms,
            synonyms=synonyms,
            related_terms=related_terms,
            confidence_score=confidence,
            expansion_method='wordnet_based'
        )
    
    def _get_wordnet_synonyms(self, word: str) -> List[str]:
        """Get synonyms for a word using WordNet with better filtering"""
        synonyms = set()
        
        # Skip common words that don't need expansion
        skip_words = {'api', 'system', 'data', 'the', 'and', 'or', 'to', 'of', 'in', 'for', 'with'}
        if word.lower() in skip_words:
            return []
        
        for syn in wordnet.synsets(word):
            # Only get synonyms from the same POS and similar semantic domain
            for lemma in syn.lemmas():
                synonym = lemma.name().replace('_', ' ').lower()
                if (synonym != word and 
                    len(synonym) > 2 and 
                    self._is_relevant_synonym(word, synonym, syn.definition())):
                    synonyms.add(synonym)
        
        # Limit and rank synonyms by relevance
        return list(synonyms)[:3]  # Top 3 most relevant
    
    def _is_relevant_synonym(self, original: str, synonym: str, definition: str) -> bool:
        """Check if synonym is contextually relevant with ITIL-specific filtering"""
        # Filter out obviously irrelevant synonyms
        irrelevant_patterns = [
            r'\b(mark|sign|symbol)\b',  # physical marks
            r'\b(period|menstruation)\b',  # biological terms
            r'\b(type|print)\b(?!.*computer)',  # typography terms when not tech-related
            r'\b(flow|flowing)\b(?!.*data|work)',  # physical flow vs workflow
        ]
        
        for pattern in irrelevant_patterns:
            if re.search(pattern, definition.lower()):
                return False
        
        # ITIL-specific term preservation
        itil_core_terms = {
            'incident', 'problem', 'change', 'request', 'ticket', 'service',
            'configuration', 'asset', 'knowledge', 'cmdb', 'itsm', 'sla',
            'urgency', 'priority', 'severity', 'escalation', 'workflow',
            'approval', 'catalog', 'fulfillment', 'deployment', 'release'
        }
        
        # Don't expand core ITIL terms - they're precise as-is
        if original.lower() in itil_core_terms:
            return False
        
        # For technical terms, prefer synonyms that contain technical indicators
        technical_contexts = ['api', 'auth', 'database', 'system', 'software', 'network']
        if any(tech in original.lower() for tech in technical_contexts):
            tech_indicators = [
                'computer', 'software', 'system', 'technology', 'digital', 
                'electronic', 'data', 'information', 'network', 'application'
            ]
            if not any(indicator in definition.lower() for indicator in tech_indicators):
                return False
        
        # For ITSM context, prefer service management related synonyms
        itsm_contexts = ['incident', 'problem', 'change', 'service', 'management']
        if any(itsm in original.lower() for itsm in itsm_contexts):
            itsm_indicators = [
                'service', 'management', 'business', 'process', 'organization',
                'customer', 'support', 'operation', 'delivery'
            ]
            # Be more lenient for ITSM terms
            if any(indicator in definition.lower() for indicator in itsm_indicators):
                return True
        
        return True
    
    def _get_related_terms(self, word: str) -> List[str]:
        """Get contextually relevant related terms"""
        related = set()
        
        # Skip expansion for very common words
        skip_words = {'the', 'and', 'or', 'to', 'of', 'in', 'for', 'with', 'is', 'are'}
        if word.lower() in skip_words:
            return []
        
        for syn in wordnet.synsets(word):
            # Only get hypernyms for now (more general terms are usually safer)
            for hypernym in syn.hypernyms()[:2]:  # Limit to closest hypernyms
                for lemma in hypernym.lemmas():
                    term = lemma.name().replace('_', ' ').lower()
                    if (term != word and 
                        len(term) > 2 and 
                        len(term.split()) <= 2):  # Avoid overly complex terms
                        related.add(term)
        
        return list(related)[:2]  # Top 2 most relevant
    
    def _decompose_query(self, query: str, intent: QueryIntent) -> List[str]:
        """Decompose complex queries into sub-queries"""
        sub_queries = []
        
        # Only decompose complex queries
        if intent.query_complexity != 'complex':
            return sub_queries
        
        # Split on conjunctions and complex indicators
        split_patterns = [
            r'\s+and\s+',
            r'\s+or\s+',
            r'\s+but\s+',
            r'\s+however\s+',
            r'\s+also\s+',
            r'[.!?]\s+'
        ]
        
        parts = [query]
        for pattern in split_patterns:
            new_parts = []
            for part in parts:
                new_parts.extend(re.split(pattern, part, flags=re.IGNORECASE))
            parts = new_parts
        
        # Clean and filter sub-queries
        for part in parts:
            part = part.strip()
            if len(part) > 10 and part != query:  # Avoid too short or identical sub-queries
                sub_queries.append(part)
        
        return sub_queries[:3]  # Limit to 3 sub-queries max
    
    def _generate_enhanced_query(self, query: str, expansion: QueryExpansion, intent: QueryIntent) -> str:
        """Generate enhanced query incorporating expansion terms"""
        # Start with original query
        enhanced = query
        
        # Add high-value expansion terms based on intent
        if intent.intent_type in ['factual', 'conceptual']:
            # For factual queries, add synonyms for better semantic matching
            if expansion.synonyms:
                top_synonyms = expansion.synonyms[:3]
                enhanced += f" {' '.join(top_synonyms)}"
        
        elif intent.intent_type == 'procedural':
            # For procedural queries, add related action terms
            action_terms = [term for term in expansion.related_terms 
                          if any(action in term for action in ['process', 'step', 'method', 'way'])]
            if action_terms:
                enhanced += f" {' '.join(action_terms[:2])}"
        
        elif intent.intent_type == 'troubleshooting':
            # For troubleshooting, add problem-solving terms
            problem_terms = [term for term in expansion.expanded_terms 
                           if any(problem in term for problem in ['solve', 'fix', 'resolve', 'debug'])]
            if problem_terms:
                enhanced += f" {' '.join(problem_terms[:2])}"
        
        return enhanced.strip()
    
    def _extract_key_terms(self, query: str) -> List[str]:
        """Extract key terms from enhanced query"""
        words = word_tokenize(query.lower())
        
        # Part-of-speech tagging to identify important terms
        pos_tags = pos_tag(words)
        
        # Extract nouns, verbs, and adjectives
        key_terms = []
        for word, pos in pos_tags:
            if (pos.startswith('NN') or pos.startswith('VB') or pos.startswith('JJ')) and \
               word not in self.stop_words and len(word) > 2:
                key_terms.append(self.lemmatizer.lemmatize(word))
        
        # Remove duplicates while preserving order
        seen = set()
        unique_terms = []
        for term in key_terms:
            if term not in seen:
                unique_terms.append(term)
                seen.add(term)
        
        return unique_terms[:15]  # Limit to top 15 key terms
    
    def _optimize_for_vector_search(self, query: str, expansion: QueryExpansion) -> List[str]:
        """Optimize query terms for semantic vector search"""
        # For vector search, we want conceptually rich terms
        words = word_tokenize(query.lower())
        vector_terms = []
        
        # Include content words from original query
        for word in words:
            if word not in self.stop_words and len(word) > 2:
                vector_terms.append(word)
        
        # Add synonyms for semantic richness
        vector_terms.extend(expansion.synonyms[:5])
        
        # Add related conceptual terms
        conceptual_terms = [term for term in expansion.related_terms 
                          if len(term.split()) == 1]  # Single words work better for vectors
        vector_terms.extend(conceptual_terms[:3])
        
        return list(set(vector_terms))[:10]  # Limit and deduplicate
    
    def _optimize_for_keyword_search(self, query: str, expansion: QueryExpansion) -> List[str]:
        """Optimize query terms for exact keyword search"""
        # For keyword search, we want specific, exact-match terms
        words = word_tokenize(query)  # Keep original case for proper nouns
        
        keyword_terms = []
        
        # Include important original terms (preserve case)
        pos_tags = pos_tag(words)
        for word, pos in pos_tags:
            if pos.startswith('NN') and word.lower() not in self.stop_words and len(word) > 2:
                keyword_terms.append(word)  # Keep original case
        
        # Add specific technical terms if detected
        technical_terms = [term for term in expansion.expanded_terms 
                         if any(tech in term.lower() for tech in ['api', 'system', 'process', 'method'])]
        keyword_terms.extend(technical_terms[:3])
        
        return list(set(keyword_terms))[:8]  # Limit and deduplicate
    
    def save_processed_query(self, processed_query: ProcessedQuery, filepath: str):
        """Save processed query to JSON file"""
        try:
            # Convert to dictionary for JSON serialization
            query_dict = asdict(processed_query)
            
            # Handle datetime serialization
            query_dict['timestamp'] = processed_query.timestamp.isoformat()
            
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(query_dict, f, indent=2, ensure_ascii=False)
            
            logger.info(f"Processed query saved to {filepath}")
            
        except Exception as e:
            logger.error(f"Failed to save processed query: {e}")
            raise
    
    def load_processed_query(self, filepath: str) -> ProcessedQuery:
        """Load processed query from JSON file"""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                query_dict = json.load(f)
            
            # Handle datetime deserialization
            query_dict['timestamp'] = datetime.fromisoformat(query_dict['timestamp'])
            
            # Reconstruct nested objects
            query_dict['intent'] = QueryIntent(**query_dict['intent'])
            query_dict['expansion'] = QueryExpansion(**query_dict['expansion'])
            
            return ProcessedQuery(**query_dict)
            
        except Exception as e:
            logger.error(f"Failed to load processed query: {e}")
            raise

# Example usage and testing
if __name__ == "__main__":
    async def test_query_processor():
        """Test the query processor with sample queries"""
        processor = QueryProcessor()
        
        test_queries = [
            "What is the API authentication process?",
            "How to debug connection errors in the system?",
            "Explain the workflow management features and their implementation",
            "Compare different deployment strategies and their benefits"
        ]
        
        for query in test_queries:
            print(f"\n{'='*60}")
            print(f"Processing: {query}")
            print('='*60)
            
            try:
                result = await processor.process_query(query)
                
                print(f"Enhanced Query: {result.enhanced_query}")
                print(f"Intent: {result.intent.intent_type} (confidence: {result.intent.confidence:.2f})")
                print(f"Complexity: {result.intent.query_complexity}")
                print(f"Key Terms: {result.key_terms}")
                print(f"Vector Terms: {result.query_vector_terms}")
                print(f"Keyword Terms: {result.keyword_terms}")
                print(f"Synonyms: {result.expansion.synonyms}")
                print(f"Sub-queries: {result.sub_queries}")
                print(f"Processing Time: {result.processing_metadata['processing_time_ms']:.2f}ms")
                
            except Exception as e:
                print(f"Error processing query: {e}")
    
    # Run the test
    asyncio.run(test_query_processor()) 