# Ultiman (MAN-O-MAN) Development Plan

This document outlines the plan to build the Ultiman AI assistant, based on the vision described in `Plan for Ultiman.md`. We will follow a **local-first development approach**, ensuring all services can be run and tested directly on a local machine before being containerized with Docker for deployment.

## Development Process Note

**Before implementing any logical script, the AI assistant will:**
1.  **Review** the requirements in `Plan for Ultiman.md`.
2.  **Propose** a specific implementation plan or logic.
3.  **Confirm** with you before writing any code.

## System Architecture

The application will be built using a microservices architecture. The goal is to prepare for containerization, but initial development will run on the local host.

The following services will be created:

1.  **`frontend-service`**: A web application (e.g., React/Next.js) providing a chat interface for users to interact with the agent. This will also include the UI for the "human-in-the-loop" approval process.
2.  **`agent-service`**: The core backend (Python/FastAPI). It will orchestrate the entire process: handle user requests from the frontend, manage the agent's reasoning loop (e.g., ReAct), query the knowledge bases, and prepare prompts for the LLM.
3.  **`vector-db-service`**: A Python/FastAPI service that wraps the FAISS vector indexes. It will load the two indexes (API knowledge and User Guide knowledge) and expose an API for semantic search.
4.  **`knowledge-graph-service`**: A Neo4j database instance. During local development, this can be run via a simple Docker command or installed directly.
5.  **`llm-service`**: A local LLM service like Ollama running an open-source model (e.g., Gemma, Llama 3). This will be installed and run directly on the local machine.
6.  **`ingestion-pipeline`**: A set of Python scripts, run directly from the command line, to process source documents and populate the knowledge bases.

## Development Phases

### Phase 1: Local Setup and Knowledge Base Population

**Goal:** Establish the local development environment and create the knowledge bases from source documents.

**Tasks:**
1.  **Project Setup:** Create the main directory structure for the project (`services/agent-service`, `services/frontend-service`, etc.).
2.  **Local Dependencies:**
    *   Provide instructions for running Neo4j and Ollama as local services.
    *   Use `.env` files from the start to manage all connection strings and configurations (e.g., `NEO4J_URI`, `LLM_API_URL`).
3.  **Backend Services (`agent-service`, `vector-db-service`):**
    *   Set up Python environments for each service.
    *   Create `requirements.txt` files for their dependencies.
4.  **Ingestion Pipeline:**
    *   Develop local Python scripts to parse the source documents. **Note:** We must use the actual `infraon-openAPI.json` and `infraon-user-guide.pdf` files.
    *   Implement logic to populate the local Neo4j instance and to create and save FAISS index files to disk.
5.  **Vector DB Service:**
    *   Implement the `vector-db-service` to load the FAISS indexes from disk and expose search endpoints on a local port (e.g., `http://localhost:8001`).
6.  **Verification:**
    *   Run all services locally (e.g., `uvicorn` for backend, `npm run dev` for frontend).
    *   Verify that the knowledge graph is populated and the vector DB serves search results on their respective `localhost` ports.

### Phase 2: Agent and Backend Logic

**Goal:** Implement the core agent that can reason and utilize the knowledge bases to answer simple queries, all running locally.

**Tasks:**
1.  **Agent Service (`agent-service`):**
    *   Build the main FastAPI application to run on a local port (e.g., `http://localhost:8000`).
    *   Establish connections to the local Neo4j, `vector-db-service`, and `llm-service` using the URLs from the `.env` file.
    *   Implement the prompt template engine and dynamic context loading mechanism.
2.  **Basic End-to-End Flow:**
    *   Create an API endpoint on the `agent-service` that takes a user query.
    *   Implement the full logic to process the query, retrieve context from other local services, call the LLM, and return a response.

### Phase 3: Advanced Agent Capabilities

**Goal:** Enhance the agent with advanced reasoning and execution capabilities within the local environment.

**Tasks:**
1.  **Advanced Prompting:** Implement advanced prompting strategies like **ReAct (Reason+Act)** and **Chain-of-Thought (CoT)** within the `agent-service`.
2.  **Action Execution:** Implement the agent's ability to execute "tools" by calling the APIs of the other local services.
3.  **Full Retrieval Pipeline:** Refine the retrieval process to follow the specified local flow: Graph query -> Vector DB query -> LLM call.
4.  **Testing and Refinement:** Thoroughly test the complete local application with the example use cases from `Plan for Ultiman.md`.

### Phase 4: Frontend and User Interaction

**Goal:** Build a user interface for seamless interaction with the local agent.

**Tasks:**
1.  **Frontend Development:**
    *   Set up a `frontend-service` using a modern web framework (e.g., Next.js) to run on a local port (e.g., `http://localhost:3000`).
    *   Design and build a chat-style user interface.
2.  **API Integration:**
    *   Connect the frontend to the `agent-service`'s local API endpoint.
    *   Display the conversation flow.
3.  **Human-in-the-Loop (HITL):**
    *   When the agent proposes a plan, display it in the UI with buttons for approval or rejection.

### Phase 5: Containerization and Deployment Preparation

**Goal:** Package the fully functional local application into Docker containers and prepare for cloud deployment.

**Tasks:**
1.  **Containerization:**
    *   Create a `Dockerfile` for each service (`frontend-service`, `agent-service`, `vector-db-service`, `ingestion-pipeline`).
    *   Create a `docker-compose.yml` file to build and run the entire application stack with a single command. Update `.env` files to use Docker service names instead of `localhost`.
2.  **Kubernetes Preparation:** Create Kubernetes manifests (Deployments, Services, etc.) for each component to prepare for GKE deployment.
3.  **Cloud Configuration:** Adapt the application's configuration to be flexible for switching from local/Docker services (like Ollama) to cloud services (like Vertex AI).
4.  **CI/CD:** Document the build and deployment process. 