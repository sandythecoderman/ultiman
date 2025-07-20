#!/bin/bash

# Stop Neo4j locally
echo "Stopping Neo4j..."

# Set Neo4j home
export NEO4J_HOME="$(pwd)/neo4j-local"

# Stop Neo4j
cd neo4j-local
./bin/neo4j stop

echo "Neo4j stopped" 