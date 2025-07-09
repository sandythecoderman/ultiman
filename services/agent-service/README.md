# Ultiman Agent Service - Simplified Architecture

A streamlined agentic pipeline for the Infraon Infinity Platform using ReAct methodology with strong anti-hallucination measures.

## Architecture Overview

This simplified agent service implements a **ReAct (Reasoning and Acting) loop** with three core tools:

1. **InfraonApiCaller** - Direct API integration with Infraon Infinity Platform
2. **KnowledgeGraphQuerier** - Neo4j-based relationship queries
3. **VectorStoreQuerier** - FAISS-based semantic search

### Key Features

- ✅ **Anti-Hallucination System** - Detects and prevents LLM hallucination
- ✅ **Gemini 1.5 Flash Integration** - Real LLM with comprehensive logging
- ✅ **Modular Tool Architecture** - Easy to extend and maintain
- ✅ **ReAct Loop Implementation** - Structured reasoning and action cycles
- ✅ **Comprehensive Logging** - Full visibility into agent decisions

## Quick Start

### 1. Install Dependencies

```bash
cd services/agent-service
pip install -r requirements.txt
```

### 2. Environment Setup

Create environment variables (or `.env` file):

```bash
# Google Cloud Configuration
export GOOGLE_CLOUD_PROJECT="ultiman-test"
export GOOGLE_APPLICATION_CREDENTIALS="../../Ultiman-cred.json"

# Infraon API Configuration  
export INFRAON_BASE_URL="https://infraonpoc.sd.everest-ims.com"
export INFRAON_TOKEN="your_infraon_token"
export INFRAON_CSRF_TOKEN="your_csrf_token"

# Neo4j Configuration (Optional)
export NEO4J_URI="bolt://localhost:7687"
export NEO4J_USERNAME="neo4j"
export NEO4J_PASSWORD="your_password"

# Agent Configuration
export MAX_ITERATIONS="5"
export TOKEN_BATCH_SIZE="5000"
export ENABLE_HALLUCINATION_DETECTION="true"
```

### 3. Test Setup

```bash
python test_agent.py
```

### 4. Run the Service

```bash
python -m uvicorn app.main:app --reload --port 8001
```

### 5. Test the API

```bash
curl -X POST "http://localhost:8001/chat" \
  -H "Content-Type: application/json" \
  -d '{"query": "What announcements are available?"}'
```

## API Endpoints

### POST /chat

Main agent endpoint that processes user queries using the ReAct loop.

**Request:**
```json
{
  "query": "Your question here",
  "session_id": "optional-session-id"
}
```

**Response:**
```json
{
  "response": "Agent's response",
  "session_id": "session-id",
  "tools_used": ["InfraonApiCaller"],
  "reasoning_steps": ["thought: ...", "action: ...", "observation: ..."]
}
```

### GET /health

Service health check endpoint.

## Tools Overview

### 1. InfraonApiCaller

Integrates with Infraon Infinity Platform APIs.

**Available Endpoints:**
- `announcements` - System announcements
- `tickets` - Help desk tickets  
- `services` - Service information
- `alerts` - Monitoring alerts
- `dashboards` - Dashboard data
- `users` - User management
- `reports` - Reporting data

**Example Usage:**
```python
tool_params = {
    "endpoint": "announcements",
    "method": "GET",
    "params": {"limit": 10}
}
```

### 2. KnowledgeGraphQuerier

Queries Neo4j knowledge graph for relationships and structured data.

**Query Types:**
- `find_entity` - Search for entities by name/ID
- `find_relationships` - Find connected entities
- `search_announcements` - Search announcements in graph
- `search_services` - Search services in graph
- `get_connected_entities` - Get entity relationships

**Example Usage:**
```python
tool_params = {
    "query_type": "find_entity",
    "search_term": "database service",
    "limit": 10
}
```

### 3. VectorStoreQuerier

Performs semantic search using FAISS vector stores.

**Available Stores:**
- `api_documentation` - API docs and examples
- `user_manuals` - User guides and tutorials
- `troubleshooting` - Problem-solving guides
- `announcements` - System announcements

**Example Usage:**
```python
tool_params = {
    "query": "How to create a ticket",
    "vector_store": "user_manuals", 
    "top_k": 5
}
```

## Anti-Hallucination System

The system includes comprehensive hallucination detection:

### Detection Patterns
- Fake IDs (ANNC-2023-001, TICKET-2023-123456)
- Old dates (2022, 2023)
- Suspicious phrases ("as an example", "fictional")

### Prevention Measures
- **Strict prompting** - Clear instructions to use only real data
- **Result validation** - Automatic screening of responses
- **Context enforcement** - Tools results must be used

## Development

### Project Structure

```
services/agent-service/
├── app/
│   ├── core/
│   │   └── orchestrator.py      # Main ReAct orchestrator
│   ├── models/
│   │   └── agent_models.py      # Data models
│   ├── tools/
│   │   ├── infraon_api_caller.py
│   │   ├── knowledge_graph_querier.py
│   │   └── vector_store_querier.py
│   └── main.py                  # FastAPI application
├── data/                        # Vector stores and indexes
├── test_agent.py               # Test script
├── requirements.txt
└── README.md
```

### Adding New Tools

1. Create tool class with `execute()` method
2. Register in `orchestrator._register_tools()`
3. Add action parsing logic in `_parse_action_decision()`
4. Update parameter enhancement in `_enhance_tool_parameters()`

### Testing

Run the test suite to verify setup:

```bash
python test_agent.py
```

## Migration to Gemma (Future)

The system is designed for easy migration from Gemini to Gemma:

### Current Model Setup
```python
# In orchestrator.py
self.model_name = "gemini-1.5-flash"
self.model = GenerativeModel(self.model_name)
```

### Future Gemma Integration

1. **Replace Vertex AI with local Gemma:**
```python
# Future implementation
from transformers import AutoTokenizer, AutoModelForCausalLM

self.tokenizer = AutoTokenizer.from_pretrained("google/gemma-2b")
self.model = AutoModelForCausalLM.from_pretrained("google/gemma-2b")
```

2. **Update the `_call_llm()` method:**
```python
async def _call_llm(self, prompt: str, session_id: str) -> str:
    inputs = self.tokenizer(prompt, return_tensors="pt")
    outputs = self.model.generate(**inputs, max_new_tokens=512)
    return self.tokenizer.decode(outputs[0], skip_special_tokens=True)
```

3. **Benefits of Gemma migration:**
   - **Open source** - Full control and customization
   - **Local deployment** - No external API dependencies
   - **Cost effective** - No per-token charges
   - **Privacy** - Data stays local

## Troubleshooting

### Common Issues

1. **Import Errors**
   - Run `pip install -r requirements.txt`
   - Check Python path configuration

2. **Google Cloud Auth Issues**
   - Verify `GOOGLE_APPLICATION_CREDENTIALS` path
   - Check service account permissions

3. **Infraon API Connection**
   - Verify tokens are current
   - Check network connectivity
   - Review API endpoint availability

4. **Neo4j Connection**
   - Ensure Neo4j is running
   - Verify credentials and URI
   - Check network connectivity

### Logging

All operations are logged with emojis for easy identification:
- 🚀 Service startup
- 🧠 LLM calls
- 🔧 Tool execution
- ⚠️ Warnings
- ❌ Errors

## Performance Considerations

- **Batch Size**: 5,000 tokens to avoid rate limits
- **Max Iterations**: 5 per query to prevent infinite loops
- **Caching**: Tools cache connections and data
- **Async Operations**: Non-blocking API calls

## Security Notes

- Environment variables for sensitive data
- No hardcoded credentials
- Input validation on all endpoints
- Anti-hallucination measures active

## Future Enhancements

1. **Multi-agent collaboration**
2. **Advanced tool chaining**
3. **Custom model fine-tuning**
4. **Real-time learning capabilities**
5. **Advanced reasoning strategies** 