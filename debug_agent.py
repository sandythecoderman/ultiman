#!/usr/bin/env python3

import sys
import os
sys.path.append('services/agent-service')

from app.core.orchestrator import AgentOrchestrator
from app.tools.vector_store_querier import VectorStoreQuerier
import asyncio

async def test_orchestrator():
    tools = [VectorStoreQuerier()]
    orchestrator = AgentOrchestrator(tools=tools, verbose=True)
    
    # Test different query types
    queries = [
        "How do I create a new user in the system?",
        "What are the user management capabilities?",
        "How do I configure the database settings?"
    ]
    
    for i, query in enumerate(queries, 1):
        print(f"\n{'='*80}")
        print(f"TEST {i}: {query}")
        print('='*80)
        
        result = await orchestrator.run(
            query=query,
            session_id=f"test-session-{i}"
        )
        
        print(f"Final result: {result}")
        print("\n" + "="*80)

if __name__ == "__main__":
    asyncio.run(test_orchestrator()) 