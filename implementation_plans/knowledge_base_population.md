# Plan: Comprehensive Knowledge Base Population

This document provides a detailed, step-by-step implementation plan for the "Auto-Population and Enrichment Strategy" section of `Plan for Ultiman.md`. It outlines how each knowledge base (Neo4j and FAISS Vector DBs) will be constructed and enriched.

---

### **Step 1: Parsing the OpenAPI Schema (Automated)**

**Goal:** To programmatically parse `infraon-openAPI.json` to extract raw API data, creating an initial, structured foundation for our knowledge bases.

**Implementation:**
1.  **Create Script:** A new script, `services/ingestion-pipeline/1_parse_api_schema.py`, will be created.
2.  **Logic:**
    *   The script will load the `infraon-openAPI.json` file.
    *   It will iterate through every path and method.
    *   For each endpoint, it will extract the `path`, `method`, `summary`, `description`, and `tags`.
3.  **Output:** The script will produce a single JSON file, `data/raw_api_spec.json`. This file will be an array of objects, with each object containing the raw extracted data for one endpoint. This file serves as the input for later LLM-driven steps.

---

### **Step 2: Ingesting Documentation into Vector DB (Fully Automated)**

**Goal:** To process the `infraon-user-guide.pdf`, enrich its content using an LLM, and populate the "User Guide and Use-Case" vector database.

**Implementation:**
1.  **Create Script:** A new script, `services/ingestion-pipeline/2_ingest_documentation.py`, will be created.
2.  **Logic:**
    *   **PDF Extraction:** The script will read `infraon-user-guide.pdf` and extract the text, chunking it into meaningful sections (e.g., by paragraph).
    *   **LLM-Powered Enrichment (Automating the "Semi-Automated" Step):** For each text chunk, the script will make an API call to Gemini 2.5 Pro with a prompt designed to generate valuable metadata:
        *   **Prompt:** `"Analyze the following text chunk from the Infraon user guide. Identify and list the primary Infraon Modules and Features it discusses. Provide a concise, one-sentence summary of the chunk. Return this as a JSON object with keys 'mentioned_modules', 'mentioned_features', and 'summary'."`
    *   **Data Aggregation:** The script will combine the original text chunk with the structured JSON output from Gemini.
3.  **Output:**
    *   The script will produce `data/enriched_user_guide.json`, an array of objects where each object contains the original text chunk and its LLM-generated metadata.
    *   This file will be used in **Step 5** to generate the vector embeddings.

---

### **Step 3: Knowledge Graph Construction via LLM**

**Goal:** To use Gemini 2.5 Pro to analyze the raw API data and user guide, inferring the complete knowledge graph ontology (Modules, Entities, and their relationships).

**Implementation:**
1.  **Create Script:** A new script, `services/ingestion-pipeline/3_construct_knowledge_graph.py`, will be created.
2.  **Multi-Prompt Logic:** The script will orchestrate a series of prompts to Gemini 2.5 Pro:
    *   **Prompt 1 (Entity Extraction):** The script will send the `data/raw_api_spec.json` content to Gemini with a prompt asking it to identify the primary `Module` and `Entity` for each API endpoint, based on path, tags, and summary.
    *   **Prompt 2 (Relationship Inference):** The script will then send the `data/enriched_user_guide.json` content along with the output from Prompt 1 to Gemini. The prompt will ask it to infer relationships *between* the entities.
        *   **Prompt:** `"Based on the provided API endpoints and user guide information, describe the relationships between the identified entities (e.g., 'An Incident can have multiple Tasks', 'A Monitoring Alert can create an Incident'). Return these as a list of relationship triples: [Entity1, RELATIONSHIP_TYPE, Entity2]."`
3.  **Output:** The script will produce `data/knowledge_graph_ontology.json`. This file will contain two key sections:
    *   `entities`: A list of all identified entities and the modules they belong to.
    *   `relationships`: A list of the inferred relationship triples.

---

### **Step 4: Enriching with External Knowledge**

**Goal:** To augment the inferred knowledge graph with real-world, best-practice information about IT Service Management (ITSM) and IT Operations Management (ITOM).

**Implementation:**
1.  **Create Script:** A new script, `services/ingestion-pipeline/4_enrich_with_web_knowledge.py`, will be created.
2.  **Logic:**
    *   The script will load the list of entities from `data/knowledge_graph_ontology.json`.
    *   For key entities (e.g., "Incident", "Change", "Problem"), it will perform targeted web searches using a tool like the **Browser** for queries like:
        *   `"ITIL best practices for Incident Management SLAs"`
        *   `"Relationship between ITIL Problem Management and Incident Management"`
    *   The script will feed the web search results to Gemini 2.5 Pro with a prompt: `"Based on the provided web search results about ITIL best practices, are there any standard relationships between the entities [Entity1, Entity2, ...] that are not already present in our existing list of relationships? If so, provide them as a list of new relationship triples."`
3.  **Output:** The script will **append** the new, externally-verified relationships to the `relationships` section in `data/knowledge_graph_ontology.json`.

---

### **Step 5: Vector Embeddings with Advanced Model**

**Goal:** To generate high-quality vector embeddings for the two vector databases using the specified `Qwen/Qwen2-Embedding-0.5B` model.

**Implementation:**
1.  **Create Script:** A new script, `services/ingestion-pipeline/5_generate_embeddings.py`, will be created.
2.  **Logic:**
    *   The script will load the specified Hugging Face embedding model (`Qwen/Qwen2-Embedding-0.5B`).
    *   **API Vector DB:** It will read the `data/raw_api_spec.json` and create a descriptive sentence for each endpoint, then generate an embedding.
    *   **User Guide Vector DB:** It will read the `data/enriched_user_guide.json` and generate an embedding for each text chunk.
3.  **Output:** The script will produce the final FAISS index files (`api_index.faiss`, `docs_index.faiss`) and their corresponding content maps (`api_content.json`, `docs_content.json`).

---

### **Step 6: Final Loading and Testing**

**Goal:** To load the final, clean, and enriched data into Neo4j and perform verification.

**Implementation:**
1.  **Create Script:** A new script, `services/ingestion-pipeline/6_load_and_test.py`, will be created.
2.  **Neo4j Loading:**
    *   The script will load `data/knowledge_graph_ontology.json`.
    *   It will iterate through the `entities` and `relationships` lists and use simple, robust `MERGE` queries to populate the Neo4j database. This step should now be error-free as all data is pre-processed and consistent.
3.  **Testing Logic:**
    *   The script will run a series of predefined Cypher queries to validate the created graph structure (e.g., "Find all Actions for the 'Incident' Entity", "Show all Entities contained within the 'ServiceDesk' Module").
    *   It will also perform sample semantic searches against the newly created FAISS indexes to ensure they return relevant results.
4.  **Output:** A success message indicating that both the graph and vector databases have been populated and passed initial verification tests.

This comprehensive, multi-stage plan accurately reflects the strategy in `Plan for Ultiman.md` and uses the specified tools to achieve the desired outcome. I am now awaiting your approval of this plan. 