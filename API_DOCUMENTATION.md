# Ultiman Agent System - API Documentation

## Overview

The Ultiman Agent System provides a comprehensive AI-powered assistant for the Infraon MAN-O-MAN platform. This documentation covers all available endpoints, authentication methods, and integration guides.

**Base URL:** `http://localhost:8003/api`

---

## Authentication

Currently, the system operates without authentication for development purposes. In production, JWT authentication will be required.

### Future Authentication (Production)
```http
Authorization: Bearer <your_jwt_token>
```

---

## Core Endpoints

### 1. Chat Endpoint

**POST** `/chat`

The main endpoint for interacting with the AI agent. Processes natural language queries and returns intelligent responses using available tools.

#### Request Body
```json
{
  "query": "string (required, 1-10000 characters)",
  "session_id": "string (optional, alphanumeric with hyphens/underscores)"
}
```

#### Response
```json
{
  "output": "string - The agent's response",
  "llm_type": "string - Type of LLM used (real_llm or enhanced_mock)",
  "session_id": "string - Session identifier",
  "tools_available": "number - Number of available tools",
  "processing_time": "number - Time taken to process (seconds)",
  "timestamp": "string - UTC timestamp"
}
```

#### Example Request
```bash
curl -X POST "http://localhost:8003/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is the current system status?",
    "session_id": "user-session-123"
  }'
```

#### Example Response
```json
{
  "output": "🟢 System Status: HEALTHY\n📊 Uptime: 99.7% (72 hours, 15 minutes)\n🔗 Database: Connected (Response time: 12ms)\n⚙️ Services: All services operational",
  "llm_type": "real_llm",
  "session_id": "user-session-123",
  "tools_available": 4,
  "processing_time": 2.345,
  "timestamp": "2024-01-15 14:30:00 UTC"
}
```

#### Error Responses

**400 Bad Request**
```json
{
  "error": "Invalid input",
  "detail": "Query cannot be empty or whitespace only",
  "error_code": "VALIDATION_ERROR",
  "timestamp": "2024-01-15 14:30:00 UTC"
}
```

**429 Too Many Requests**
```json
{
  "error": "Rate limit exceeded",
  "detail": "Too many requests. Please wait before trying again.",
  "error_code": "RATE_LIMIT_EXCEEDED",
  "timestamp": "2024-01-15 14:30:00 UTC"
}
```

---

### 2. System Status

**GET** `/status`

Returns the current operational status of the agent service.

#### Response
```json
{
  "status": "operational",
  "llm_type": "real_llm",
  "tools_available": 4,
  "tools": [
    "VectorDB Documentation Search",
    "Knowledge Graph Querier", 
    "Infraon API Caller",
    "MCP Tool Caller"
  ],
  "timestamp": "2024-01-15 14:30:00 UTC"
}
```

#### Example Request
```bash
curl -X GET "http://localhost:8003/api/status"
```

---

### 3. Health Check Endpoints

#### Basic Health Check

**GET** `/health`

Basic health check for load balancers and monitoring systems.

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15 14:30:00 UTC",
  "services": {
    "orchestrator": "operational",
    "tools": 4,
    "llm": "real_llm"
  }
}
```

#### Detailed Health Check

**GET** `/health/detailed`

Comprehensive health check that tests all external services.

```json
{
  "overall_status": "healthy",
  "timestamp": "2024-01-15 14:30:00 UTC",
  "agent_service": {
    "status": "healthy",
    "llm_type": "real_llm",
    "tools_available": 4,
    "tools": ["VectorDB Documentation Search", "Knowledge Graph Querier", "Infraon API Caller", "MCP Tool Caller"]
  },
  "external_services": {
    "vector_db": {
      "status": "healthy",
      "response_time": 0.045,
      "message": "Vector DB service is operational",
      "details": {
        "status_code": 200,
        "endpoint": "http://localhost:8004/health"
      }
    },
    "neo4j": {
      "status": "healthy", 
      "response_time": 0.123,
      "message": "Neo4j database is operational",
      "details": {
        "uri": "bolt://localhost:7687",
        "test_query": "successful"
      }
    },
    "infraon_api": {
      "status": "unknown",
      "response_time": 0.001,
      "message": "Infraon API service not accessible (expected for local development)",
      "details": {
        "error": "connection_error"
      }
    },
    "vertex_ai": {
      "status": "healthy",
      "response_time": 1.234,
      "message": "Vertex AI service is operational",
      "details": {
        "project_id": "ultiman",
        "location": "us-central1",
        "model": "gemini-2.5-flash"
      }
    }
  },
  "summary": {
    "total_services": 4,
    "healthy_services": 3,
    "degraded_services": 0,
    "unhealthy_services": 0,
    "unknown_services": 1
  }
}
```

#### Uptime Statistics

**GET** `/health/uptime`

Get uptime statistics for all services over the last 24 hours.

```json
{
  "timestamp": "2024-01-15 14:30:00 UTC",
  "uptime_stats": {
    "vector_db": {
      "uptime_24h": 99.5,
      "current_status": "healthy"
    },
    "neo4j": {
      "uptime_24h": 100.0,
      "current_status": "healthy"
    },
    "infraon_api": {
      "uptime_24h": 0.0,
      "current_status": "unknown"
    },
    "vertex_ai": {
      "uptime_24h": 98.7,
      "current_status": "healthy"
    }
  },
  "overall_uptime": 74.55
}
```

#### Service Health History

**GET** `/health/history/{service_name}?hours=24`

Get health check history for a specific service.

**Parameters:**
- `service_name`: Name of the service (vector_db, neo4j, infraon_api, vertex_ai)
- `hours`: Number of hours to look back (default: 24)

```json
{
  "service_name": "vector_db",
  "hours": 24,
  "total_checks": 144,
  "uptime_percentage": 99.5,
  "history": [
    {
      "timestamp": "2024-01-15T14:30:00Z",
      "status": "healthy",
      "response_time": 0.045,
      "message": "Vector DB service is operational"
    },
    {
      "timestamp": "2024-01-15T14:29:00Z", 
      "status": "healthy",
      "response_time": 0.052,
      "message": "Vector DB service is operational"
    }
  ]
}
```

---

## Available Tools

The agent system includes four specialized tools:

### 1. VectorDB Documentation Search
- **Purpose**: Search through indexed documentation and knowledge base
- **Use Cases**: API usage guides, how-to documentation, troubleshooting steps
- **Data Sources**: Infraon API documentation, user guides, FAQ content

### 2. Knowledge Graph Querier  
- **Purpose**: Query relationships between system components
- **Use Cases**: Understanding service dependencies, system architecture, component relationships
- **Data Sources**: Neo4j database with infrastructure topology

### 3. Infraon API Caller
- **Purpose**: Make live API calls to Infraon platform
- **Use Cases**: Real-time system status, user management, incident creation
- **Capabilities**: System health, performance metrics, user operations, incident management

### 4. MCP Tool Caller
- **Purpose**: Access external documentation and context
- **Use Cases**: Additional reference material, external API documentation
- **Integration**: Context7 MCP servers for extended knowledge

---

## Query Examples

### System Status Queries
```bash
# Get overall system health
curl -X POST "http://localhost:8003/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the current system status?"}'

# Check performance metrics  
curl -X POST "http://localhost:8003/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"query": "Show me the current CPU and memory usage"}'
```

### User Management Queries
```bash
# List all users
curl -X POST "http://localhost:8003/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"query": "List all users in the system"}'

# Create a new user
curl -X POST "http://localhost:8003/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"query": "How do I create a new user with admin privileges?"}'
```

### Incident Management Queries
```bash
# View open incidents
curl -X POST "http://localhost:8003/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"query": "Show me all open incidents"}'

# Create incident
curl -X POST "http://localhost:8003/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"query": "Create a new incident for server downtime"}'
```

### Documentation Queries
```bash
# API documentation
curl -X POST "http://localhost:8003/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"query": "How do I authenticate with the Infraon API?"}'

# Troubleshooting help
curl -X POST "http://localhost:8003/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"query": "How do I troubleshoot high CPU usage?"}'
```

---

## Rate Limiting

- **Limit**: 100 requests per minute per client
- **Enforcement**: Based on client IP (simplified for development)
- **Headers**: Rate limit information included in response headers (future enhancement)

---

## Error Handling

All endpoints return structured error responses with:

- **error**: Brief error description
- **detail**: Detailed error message  
- **error_code**: Machine-readable error code
- **timestamp**: UTC timestamp when error occurred

### Common Error Codes

- `VALIDATION_ERROR`: Invalid input data
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_ERROR`: Server-side error
- `SERVICE_UNAVAILABLE`: External service unavailable
- `TIMEOUT_ERROR`: Request timeout

---

## Integration Guide

### Basic Integration

1. **Start the agent service**:
   ```bash
   cd services/agent-service
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8003
   ```

2. **Test connectivity**:
   ```bash
   curl -X GET "http://localhost:8003/api/status"
   ```

3. **Send your first query**:
   ```bash
   curl -X POST "http://localhost:8003/api/chat" \
     -H "Content-Type: application/json" \
     -d '{"query": "Hello, what can you help me with?"}'
   ```

### Advanced Integration

#### Session Management
Use consistent `session_id` values to maintain conversation context:

```python
import requests

session_id = "user-12345"
base_url = "http://localhost:8003/api"

# First query
response1 = requests.post(f"{base_url}/chat", json={
    "query": "What is the system status?",
    "session_id": session_id
})

# Follow-up query (maintains context)
response2 = requests.post(f"{base_url}/chat", json={
    "query": "Can you show me more details about the database?",
    "session_id": session_id
})
```

#### Error Handling
```python
import requests
from requests.exceptions import RequestException

def query_agent(query, session_id=None):
    try:
        response = requests.post(
            "http://localhost:8003/api/chat",
            json={"query": query, "session_id": session_id},
            timeout=30
        )
        
        if response.status_code == 200:
            return response.json()
        elif response.status_code == 429:
            print("Rate limit exceeded, please wait")
            return None
        else:
            error_data = response.json()
            print(f"Error: {error_data.get('detail', 'Unknown error')}")
            return None
            
    except RequestException as e:
        print(f"Request failed: {e}")
        return None
```

#### Health Monitoring
```python
import requests
import time

def monitor_agent_health():
    try:
        response = requests.get("http://localhost:8003/api/health/detailed")
        if response.status_code == 200:
            health_data = response.json()
            overall_status = health_data["overall_status"]
            print(f"Agent Status: {overall_status}")
            
            # Check individual services
            for service, details in health_data["external_services"].items():
                status = details["status"]
                response_time = details["response_time"]
                print(f"  {service}: {status} ({response_time:.3f}s)")
                
        else:
            print("Health check failed")
            
    except Exception as e:
        print(f"Health monitoring error: {e}")

# Run health check every 60 seconds
while True:
    monitor_agent_health()
    time.sleep(60)
```

---

## Performance Considerations

### Response Times
- **Simple queries**: 1-3 seconds
- **Complex queries**: 3-10 seconds  
- **Tool-heavy queries**: 5-15 seconds

### Optimization Tips
1. Use specific queries rather than vague requests
2. Maintain session context for follow-up questions
3. Monitor health endpoints for service availability
4. Implement proper error handling and retries

### Scaling Considerations
- Current setup supports ~100 concurrent users
- For higher loads, consider:
  - Load balancing multiple agent instances
  - Caching frequently requested data
  - Database connection pooling
  - Redis for session management

---

## Development and Testing

### Local Development Setup
```bash
# Start all services
docker-compose up -d

# Start agent service
cd services/agent-service
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8003

# Test endpoints
curl -X GET "http://localhost:8003/api/status"
curl -X GET "http://localhost:8003/api/health/detailed"
```

### Testing Queries
```bash
# Test each tool type
curl -X POST "http://localhost:8003/api/chat" -H "Content-Type: application/json" \
  -d '{"query": "Search documentation for user creation"}' # VectorDB

curl -X POST "http://localhost:8003/api/chat" -H "Content-Type: application/json" \
  -d '{"query": "What services depend on the database?"}' # Knowledge Graph

curl -X POST "http://localhost:8003/api/chat" -H "Content-Type: application/json" \
  -d '{"query": "Show current system status"}' # Infraon API

curl -X POST "http://localhost:8003/api/chat" -H "Content-Type: application/json" \
  -d '{"query": "Find external documentation about APIs"}' # MCP Tool
```

---

## Troubleshooting

### Common Issues

#### 1. Service Not Starting
```bash
# Check port availability
netstat -tulpn | grep 8003

# Check logs
tail -f logs/agent-service.log
```

#### 2. External Services Unavailable
```bash
# Check service health
curl -X GET "http://localhost:8003/api/health/detailed"

# Restart services
docker-compose restart
```

#### 3. Poor Response Quality
- Ensure real LLM is properly configured
- Check if all external services are healthy
- Verify Vector DB has sufficient documentation
- Confirm Knowledge Graph is populated

#### 4. Rate Limiting Issues
- Implement proper request spacing
- Use session management for related queries
- Consider upgrading rate limits for production

### Support

For additional support:
1. Check the health endpoints for service status
2. Review logs for detailed error information
3. Ensure all dependencies are properly configured
4. Verify network connectivity to external services

---

## Changelog

### Version 1.0.0 (Current)
- Initial release with core chat functionality
- Four integrated tools (VectorDB, Knowledge Graph, Infraon API, MCP)
- Real LLM integration (Gemini 2.5 Flash)
- Comprehensive health monitoring
- Rate limiting and error handling
- Enhanced mock responses for development

### Planned Features (v1.1.0)
- JWT authentication
- WebSocket support for real-time chat
- Enhanced session management
- Conversation history persistence
- Advanced analytics and metrics
- Multi-tenant support 