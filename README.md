# Ultiman AI Assistant

This project is the implementation of the MAN-O-MAN platform as described in `Plan for Ultiman.md`.

## Local Development Setup

This project follows a local-first development approach. Before running the application services, you need to start the required backing services (Database, LLM).

### 1. Running Neo4j

The knowledge graph is stored in a Neo4j database. The simplest way to run this locally is with Docker.

Execute the following command in your terminal to start a Neo4j container. This will expose the database on the standard ports and set a default password.

```bash
docker run \
    --name ultiman-neo4j \
    -p 7474:7474 -p 7687:7687 \
    -d \
    --env NEO4J_AUTH=neo4j/password \
    neo4j:5.18.1-community
```

- **Web Interface:** You can access the Neo4j Browser at `http://localhost:7474`.
- **Connection URI:** The application will connect to the database using `neo4j://localhost:7687`.
- **Credentials:** The username is `neo4j` and the password is `password`.

You only need to run this command once. You can start/stop the container later using `docker start ultiman-neo4j` and `docker stop ultiman-neo4j`. 