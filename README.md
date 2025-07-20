# Ultiman - Local Development Setup

Ultiman is an intelligent workflow management system with knowledge graph capabilities. This setup runs all services locally without Docker dependencies.

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Java 11+ (for Neo4j)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ultiman
   ```

2. **Install Python dependencies**
   ```bash
   # Create virtual environment
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   
   # Install main requirements
   pip install -r requirements.txt
   
   # Install agent service dependencies
   cd services/agent-service
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   cd ../..
   ```

3. **Install Node.js dependencies**
   ```bash
   cd services/frontend-service
   npm install
   cd ../..
   ```

4. **Start all services**
   ```bash
   ./start_all_services.sh
   ```

## 📋 Services

### Frontend Service
- **URL**: http://localhost:5173
- **Technology**: React + Vite
- **Purpose**: Main user interface

### Agent Service
- **URL**: http://localhost:8000
- **Technology**: FastAPI + Python
- **Purpose**: AI agent and workflow management

### Neo4j Database
- **URL**: http://localhost:7474 (Browser)
- **Bolt**: bolt://localhost:7687
- **Purpose**: Knowledge graph storage

## 🛠️ Management Scripts

### Start Services
```bash
./start_all_services.sh
```

### Stop Services
```bash
./stop_all_services.sh
```

### Individual Service Control
```bash
# Neo4j
./start_neo4j.sh
./stop_neo4j.sh

# Agent Service
cd services/agent-service
source venv/bin/activate
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend Service
cd services/frontend-service
npm run dev
```

## 🔧 Configuration

Environment variables are configured in `env.local`. Key settings:

- `NEO4J_URI`: Neo4j connection string
- `NEO4J_USERNAME`: Neo4j username (default: neo4j)
- `NEO4J_PASSWORD`: Neo4j password (default: password)
- `AGENT_SERVICE_URL`: Agent service URL
- `FRONTEND_URL`: Frontend service URL

## 📁 Project Structure

```
ultiman/
├── app/                    # Main API application
├── services/
│   ├── frontend-service/   # React frontend
│   ├── agent-service/      # AI agent service
│   └── data-pipeline/      # Data processing
├── neo4j-local/           # Local Neo4j installation
├── start_all_services.sh  # Start all services
├── stop_all_services.sh   # Stop all services
└── env.local              # Local environment config
```

## 🐛 Troubleshooting

### Port Conflicts
If services fail to start due to port conflicts:
```bash
# Check what's using a port
lsof -i :8000
lsof -i :5173
lsof -i :7474

# Kill processes if needed
kill -9 <PID>
```

### Neo4j Issues
```bash
# Check Neo4j status
cd neo4j-local
./bin/neo4j status

# Reset Neo4j password
./bin/neo4j-admin set-initial-password newpassword
```

### Service Dependencies
- Frontend depends on Agent Service
- Agent Service depends on Neo4j
- All services should be started in order

## 🔄 Migration from Docker

This project has been migrated from Docker to local services:

- ❌ Removed: `docker-compose.yml`, `Dockerfile`, `.dockerignore`
- ✅ Added: Local Neo4j installation, startup scripts, local environment config
- 🔄 Updated: Service configurations to use localhost instead of Docker containers

## 📝 Development Notes

- All services run locally without containerization
- Neo4j data is persisted in `neo4j-local/data/`
- Services can be started/stopped individually or together
- Environment variables are managed through `env.local` 