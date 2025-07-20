#!/bin/bash

echo "🚀 Starting all Ultiman services locally..."

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  Port $1 is already in use"
        return 1
    else
        return 0
    fi
}

# Start Neo4j
echo "📊 Starting Neo4j..."
if check_port 7474 && check_port 7687; then
    ./start_neo4j.sh &
    NEO4J_PID=$!
    echo "Neo4j started with PID: $NEO4J_PID"
    sleep 10  # Wait for Neo4j to fully start
else
    echo "Neo4j ports are already in use, skipping..."
fi

# Start Agent Service
echo "🤖 Starting Agent Service..."
if check_port 8000; then
    cd services/agent-service
    source venv/bin/activate
    python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
    AGENT_PID=$!
    echo "Agent Service started with PID: $AGENT_PID"
    cd ../..
else
    echo "Agent Service port 8000 is already in use, skipping..."
fi

# Start Frontend Service
echo "🎨 Starting Frontend Service..."
if check_port 5173; then
    cd services/frontend-service
    npm run dev &
    FRONTEND_PID=$!
    echo "Frontend Service started with PID: $FRONTEND_PID"
    cd ../..
else
    echo "Frontend Service port 5173 is already in use, skipping..."
fi

echo ""
echo "✅ All services started!"
echo ""
echo "📋 Service URLs:"
echo "   Frontend: http://localhost:5173"
echo "   Agent Service: http://localhost:8000"
echo "   Neo4j Browser: http://localhost:7474"
echo ""
echo "🔧 To stop all services, run: ./stop_all_services.sh"
echo ""

# Save PIDs to file for stopping later
echo "$NEO4J_PID $AGENT_PID $FRONTEND_PID" > .service_pids 