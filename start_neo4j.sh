#!/bin/bash

# Start Neo4j locally
echo "Starting Neo4j locally..."

# Set Neo4j home
export NEO4J_HOME="$(pwd)/neo4j-local"

# Set initial password
export NEO4J_AUTH=neo4j/password

# Start Neo4j
cd neo4j-local
./bin/neo4j start

echo "Neo4j started on ports 7474 (HTTP) and 7687 (Bolt)"
echo "Access Neo4j Browser at: http://localhost:7474"
echo "Username: neo4j"
echo "Password: password" 