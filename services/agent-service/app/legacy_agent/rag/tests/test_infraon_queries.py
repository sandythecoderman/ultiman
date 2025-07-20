"""
Test Infraon Platform Specific Queries
Tests query processor performance on real Infraon user guide scenarios
"""

import asyncio
import time
from knowledgeBase.agent.rag.core.query_processor import QueryProcessor

async def test_infraon_platform_queries():
    """Test query processor with real Infraon platform questions"""
    
    print("🔧 Testing Infraon Platform Query Processing")
    print("=" * 60)
    
    # Initialize processor
    processor = QueryProcessor()
    print("✅ QueryProcessor initialized successfully")
    
    # Real Infraon platform queries based on user guide
    infraon_queries = {
        'TICKET_CREATION': "How to create a new incident ticket in the workspace?",
        'PRIORITY_SETTING': "What are the different priority levels for incidents and how to set them?",
        'SLA_MANAGEMENT': "How does SLA response time work for critical incidents?",
        'CHANGE_MANAGEMENT': "How to submit a change request for production deployment?",
        'PROBLEM_ANALYSIS': "What is the process for root cause analysis of recurring problems?",
        'SERVICE_CATALOG': "How to access and use the service catalog for request fulfillment?",
        'CMDB_CONFIGURATION': "How to configure CMDB relationships between configuration items?",
        'KNOWLEDGE_BASE': "Where can I find knowledge articles and how to create new ones?",
        'ESCALATION_PROCESS': "When should I escalate an incident and what is the escalation matrix?",
        'ATTACHMENT_HANDLING': "How to add attachments to tickets and what file types are supported?",
        'COMMUNICATION_TAB': "How to use the communication tab for ticket updates and replies?",
        'RELATION_TICKETS': "How to link related tickets and set relationship types?",
        'WORKSPACE_METADATA': "How does workspace metadata update affect ticket synchronization?",
        'RELEASE_MANAGEMENT': "What is the process for release management and version control?",
        'APPROVAL_WORKFLOW': "How does the approval workflow work for service requests?",
        'ASSET_MANAGEMENT': "How to track and manage IT assets in the CMDB?",
        'INCIDENT_STATUS': "What are the different incident status options and their meanings?",
        'URGENCY_IMPACT': "How to determine urgency and impact levels for service requests?",
        'COMPLIANCE_AUDIT': "How does Infraon support compliance auditing and reporting?",
        'API_INTEGRATION': "How to integrate third-party systems using Infraon APIs?"
    }
    
    print(f"\n🎯 Testing {len(infraon_queries)} Infraon Platform Queries:")
    print("-" * 60)
    
    results = []
    total_time = 0
    
    for query_name, query_text in infraon_queries.items():
        start_time = time.time()
        
        try:
            # Process the query
            result = await processor.process_query(query_text)
            
            processing_time = (time.time() - start_time) * 1000  # Convert to ms
            total_time += processing_time
            
            # Extract key information
            intent = result.intent
            expansion = result.expansion
            domains = intent.domain_focus
            
            print(f"\n📝 {query_name}:")
            print(f"Query: {query_text}")
            print(f"Intent: {intent.intent_type} (confidence: {intent.confidence:.2f})")
            print(f"Complexity: {intent.query_complexity}")
            print(f"Domains: {', '.join(domains)}")
            print(f"Answer Type: {intent.expected_answer_type}")
            
            # Show synonyms/expansion if any
            if expansion.synonyms:
                print(f"Synonyms: {', '.join(expansion.synonyms[:5])}")
            if expansion.related_terms:
                print(f"Related: {', '.join(expansion.related_terms[:3])}")
            
            # Show sub-queries if any
            if result.sub_queries:
                print(f"Sub-queries: {len(result.sub_queries)}")
                for i, sub in enumerate(result.sub_queries[:2], 1):
                    print(f"  {i}. {sub}")
            
            print(f"Processing: {processing_time:.1f}ms")
            
            # Store results for analysis
            results.append({
                'query_name': query_name,
                'query_text': query_text,
                'intent_type': intent.intent_type,
                'confidence': intent.confidence,
                'complexity': intent.query_complexity,
                'domains': domains,
                'synonyms_count': len(expansion.synonyms),
                'processing_time': processing_time
            })
            
        except Exception as e:
            print(f"❌ Error processing {query_name}: {str(e)}")
            continue
    
    # Performance and accuracy analysis
    print(f"\n📊 Analysis Summary:")
    print("=" * 60)
    
    if results:
        avg_time = total_time / len(results)
        avg_confidence = sum(r['confidence'] for r in results) / len(results)
        
        # Intent distribution
        intent_counts = {}
        for r in results:
            intent_counts[r['intent_type']] = intent_counts.get(r['intent_type'], 0) + 1
        
        # Domain distribution  
        domain_counts = {}
        for r in results:
            for domain in r['domains']:
                domain_counts[domain] = domain_counts.get(domain, 0) + 1
        
        print(f"Total queries processed: {len(results)}")
        print(f"Average processing time: {avg_time:.1f}ms")
        print(f"Average confidence score: {avg_confidence:.2f}")
        
        print(f"\nIntent Distribution:")
        for intent, count in sorted(intent_counts.items()):
            percentage = (count / len(results)) * 100
            print(f"  {intent}: {count} ({percentage:.1f}%)")
        
        print(f"\nDomain Distribution:")
        for domain, count in sorted(domain_counts.items(), key=lambda x: x[1], reverse=True):
            percentage = (count / sum(domain_counts.values())) * 100
            print(f"  {domain}: {count} ({percentage:.1f}%)")
        
        # Confidence analysis
        high_confidence = len([r for r in results if r['confidence'] >= 0.7])
        medium_confidence = len([r for r in results if 0.4 <= r['confidence'] < 0.7])
        low_confidence = len([r for r in results if r['confidence'] < 0.4])
        
        print(f"\nConfidence Score Distribution:")
        print(f"  High (≥0.7): {high_confidence} ({high_confidence/len(results)*100:.1f}%)")
        print(f"  Medium (0.4-0.69): {medium_confidence} ({medium_confidence/len(results)*100:.1f}%)")
        print(f"  Low (<0.4): {low_confidence} ({low_confidence/len(results)*100:.1f}%)")
        
        # ITIL domain coverage
        itil_domains = [d for d in domain_counts.keys() if d.startswith('itil_')]
        print(f"\nITIL Domain Coverage: {len(itil_domains)} domains detected")
        for domain in itil_domains:
            print(f"  {domain}: {domain_counts[domain]} queries")
    
    print(f"\n✅ Infraon Platform Query Testing Complete! 🚀")

if __name__ == "__main__":
    asyncio.run(test_infraon_platform_queries()) 