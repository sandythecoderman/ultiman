#!/bin/bash

echo "🛑 Stopping all Ultiman services..."

# Stop Neo4j
echo "📊 Stopping Neo4j..."
./stop_neo4j.sh

# Kill processes by PIDs if file exists
if [ -f .service_pids ]; then
    echo "🔪 Killing service processes..."
    pids=$(cat .service_pids)
    for pid in $pids; do
        if [ ! -z "$pid" ] && kill -0 $pid 2>/dev/null; then
            echo "Killing process $pid"
            kill $pid
        fi
    done
    rm .service_pids
fi

# Kill processes by port
echo "🔪 Killing processes by port..."

# Kill process on port 8000 (Agent Service)
if lsof -ti:8000 > /dev/null 2>&1; then
    echo "Killing process on port 8000"
    lsof -ti:8000 | xargs kill -9
fi

# Kill process on port 5173 (Frontend Service)
if lsof -ti:5173 > /dev/null 2>&1; then
    echo "Killing process on port 5173"
    lsof -ti:5173 | xargs kill -9
fi

echo "✅ All services stopped!" 