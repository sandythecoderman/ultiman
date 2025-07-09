#!/usr/bin/env python3
"""
Script to integrate real Gemini 2.5 Flash LLM into the ReAct loop.
This script shows how to replace the Mock LLM with the real LLM when ready.
"""

import os
import sys
import asyncio
from typing import Optional

# Add the services directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'services', 'agent-service'))

def check_vertex_ai_setup() -> dict:
    """Check if Vertex AI is properly configured"""
    setup_status = {
        "credentials": False,
        "project_id": False,
        "langchain_installed": False,
        "ready": False
    }
    
    # Check for credentials
    if os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
        setup_status["credentials"] = True
        print("✅ GOOGLE_APPLICATION_CREDENTIALS found")
    else:
        print("❌ GOOGLE_APPLICATION_CREDENTIALS not set")
    
    # Check for project ID
    if os.getenv("GOOGLE_CLOUD_PROJECT"):
        setup_status["project_id"] = True
        print("✅ GOOGLE_CLOUD_PROJECT found")
    else:
        print("❌ GOOGLE_CLOUD_PROJECT not set")
    
    # Check if langchain-google-vertexai is installed
    try:
        import langchain_google_vertexai
        setup_status["langchain_installed"] = True
        print("✅ langchain-google-vertexai installed")
    except ImportError:
        print("❌ langchain-google-vertexai not installed")
    
    setup_status["ready"] = all([
        setup_status["credentials"],
        setup_status["project_id"],
        setup_status["langchain_installed"]
    ])
    
    return setup_status

def create_real_llm_orchestrator():
    """Create orchestrator with real LLM integration"""
    
    # Enhanced prompt template optimized for Gemini
    ENHANCED_REACT_PROMPT = """
You are an intelligent assistant with access to specialized tools for the Infraon MAN-O-MAN platform. Your goal is to provide accurate, helpful responses by using the right tools and reasoning through problems step by step.

Available Tools:
{tools}

Tool Selection Guidelines:
- Use VectorDB Documentation Search for: API usage, how-to guides, procedural information, code examples
- Use Knowledge Graph Querier for: Relationships between components, system architecture, dependencies, module connections
- Use Infraon API Caller for: Live system data, current status, real-time information, health checks
- Use MCP Tool Caller for: External documentation, library references, additional context, examples

Response Format:
Question: [the user's question]
Thought: [your reasoning about what information you need and which tool to use]
Action: [exact tool name from the list: {tool_names}]
Action Input: [specific, focused input for the tool]
Observation: [tool's response]
Thought: [your analysis of the tool's response and next steps]
Action: [next tool if needed, or move to Final Answer]
Action Input: [input for next tool]
Observation: [next tool's response]
Thought: [final reasoning based on all gathered information]
Final Answer: [comprehensive answer based on all tool results]

Important Guidelines:
- Always analyze tool responses carefully and extract specific information
- Use concrete details from tool outputs in your final answer
- If one tool doesn't provide enough information, try another relevant tool
- Provide detailed, actionable answers with examples when possible
- Be specific about API endpoints, required fields, and procedures
- If you encounter errors, explain what went wrong and suggest alternatives

Question: {query}
{scratchpad}
"""
    
    # Create the real LLM orchestrator
    from app.core.orchestrator import AgentOrchestrator
    from app.core.prompt_assembler import DynamicPromptAssembler
    from app.tools.vector_store_querier import VectorStoreQuerier
    from app.tools.knowledge_graph_querier import KnowledgeGraphQuerier
    from app.tools.infraon_api_caller import InfraonApiCaller
    from app.tools.mcp_tool_caller import MCPToolCaller
    
    try:
        from langchain_google_vertexai import ChatVertexAI
        
        # Create real LLM with optimized settings
        real_llm = ChatVertexAI(
            model_name="gemini-2.5-flash",
            temperature=0.1,  # Low temperature for consistent, focused responses
            max_tokens=2048,  # Sufficient for detailed responses
            top_p=0.8,       # Balanced creativity and focus
        )
        
        print("✅ Real LLM (Gemini 2.5 Flash) initialized successfully")
        
        # Create tools
        tools = [
            VectorStoreQuerier(),
            KnowledgeGraphQuerier(),
            InfraonApiCaller(),
            MCPToolCaller()
        ]
        
        # Create orchestrator with real LLM
        class RealLLMOrchestrator(AgentOrchestrator):
            def __init__(self, tools, verbose=True):
                self.llm = real_llm
                self.tools = tools
                self.prompt_assembler = DynamicPromptAssembler(
                    base_prompt_template=ENHANCED_REACT_PROMPT
                )
                self.verbose = verbose
        
        orchestrator = RealLLMOrchestrator(tools=tools, verbose=True)
        
        return orchestrator, "real_llm"
        
    except Exception as e:
        print(f"⚠️ Could not initialize real LLM: {e}")
        print("🔄 Falling back to Enhanced Mock LLM...")
        
        # Fallback to enhanced mock LLM
        from app.core.enhanced_mock_llm import EnhancedMockLLM
        
        class EnhancedMockOrchestrator(AgentOrchestrator):
            def __init__(self, tools, verbose=True):
                self.llm = EnhancedMockLLM()
                self.tools = tools
                self.prompt_assembler = DynamicPromptAssembler(
                    base_prompt_template=ENHANCED_REACT_PROMPT
                )
                self.verbose = verbose
        
        tools = [
            VectorStoreQuerier(),
            KnowledgeGraphQuerier(),
            InfraonApiCaller(),
            MCPToolCaller()
        ]
        
        orchestrator = EnhancedMockOrchestrator(tools=tools, verbose=True)
        
        return orchestrator, "enhanced_mock"

async def test_real_llm_integration():
    """Test the real LLM integration"""
    print("🧪 Testing Real LLM Integration...")
    print("=" * 50)
    
    # Check setup
    setup_status = check_vertex_ai_setup()
    
    if setup_status["ready"]:
        print("✅ Vertex AI setup is ready for real LLM integration")
    else:
        print("⚠️ Vertex AI setup incomplete - will use Enhanced Mock LLM")
    
    print("\n" + "=" * 50)
    
    # Create orchestrator
    orchestrator, llm_type = create_real_llm_orchestrator()
    
    print(f"🤖 Using LLM Type: {llm_type.upper()}")
    print("=" * 50)
    
    # Test queries
    test_queries = [
        "How do I create a new user in the system?",
        "What is the current system status?",
        "Show me the relationships between modules"
    ]
    
    for i, query in enumerate(test_queries, 1):
        print(f"\n🧪 Test {i}: {query}")
        print("-" * 40)
        
        try:
            result = await orchestrator.run(query, session_id="real_llm_test")
            print(f"✅ Response: {result['output'][:200]}...")
            
            if hasattr(orchestrator.llm, 'call_count'):
                print(f"📊 LLM Calls: {orchestrator.llm.call_count}")
        
        except Exception as e:
            print(f"❌ Error: {e}")
        
        print("-" * 40)
    
    print(f"\n✅ Real LLM integration test completed using {llm_type}")

def setup_instructions():
    """Print setup instructions for real LLM integration"""
    print("📋 Real LLM Integration Setup Instructions")
    print("=" * 50)
    
    print("\n1. 🔧 Install Required Dependencies:")
    print("   pip install langchain-google-vertexai")
    print("   pip install google-cloud-aiplatform")
    
    print("\n2. 🔑 Set up Google Cloud Credentials:")
    print("   # Option 1: Service Account Key")
    print("   export GOOGLE_APPLICATION_CREDENTIALS='/path/to/service-account-key.json'")
    print("   ")
    print("   # Option 2: Application Default Credentials")
    print("   gcloud auth application-default login")
    
    print("\n3. 🌐 Set Project ID:")
    print("   export GOOGLE_CLOUD_PROJECT='your-project-id'")
    
    print("\n4. 🚀 Update Orchestrator:")
    print("   # Edit services/agent-service/app/core/orchestrator.py")
    print("   # Uncomment the ChatVertexAI import and initialization")
    print("   # Replace self.llm = EnhancedMockLLM() with self.llm = ChatVertexAI(...)")
    
    print("\n5. ✅ Test Integration:")
    print("   python3 integrate_real_llm.py")
    
    print("\n💡 Benefits of Real LLM Integration:")
    print("   • Natural language understanding and generation")
    print("   • Complex reasoning and multi-step problem solving")
    print("   • Dynamic tool selection based on context")
    print("   • Better error handling and recovery")
    print("   • Improved response quality and specificity")

def main():
    """Main function"""
    print("🚀 Real LLM Integration for ReAct Loop")
    print("=" * 50)
    
    import argparse
    parser = argparse.ArgumentParser(description='Integrate real LLM into ReAct loop')
    parser.add_argument('--test', action='store_true', help='Run integration test')
    parser.add_argument('--setup', action='store_true', help='Show setup instructions')
    
    args = parser.parse_args()
    
    if args.setup:
        setup_instructions()
    elif args.test:
        asyncio.run(test_real_llm_integration())
    else:
        print("Usage:")
        print("  python3 integrate_real_llm.py --setup   # Show setup instructions")
        print("  python3 integrate_real_llm.py --test    # Test integration")

if __name__ == "__main__":
    main() 