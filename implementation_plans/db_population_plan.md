# Plan: Gemini-Powered Database Population Strategy

This document outlines the correct, AI-driven strategy for populating the Neo4j and FAISS knowledge bases, adhering to the "Auto-Population and Enrichment Strategy" from `Plan for Ultiman.md`.

This process is divided into two distinct phases:
1.  **Phase 1: Knowledge Extraction with Gemini 2.5 Pro.** A one-time, powerful analysis to create a clean, structured dataset.
2.  **Phase 2: Simplified Data Ingestion.** A simple, robust script to load the pre-processed data into the databases.

---

### Phase 1: Knowledge Extraction with Gemini 2.5 Pro

**Goal:** To use the advanced reasoning of Gemini 2.5 Pro via the GCP Vertex AI API to analyze the `infraon-openAPI.json` file and produce a structured, enriched data file.

**Tooling:**
*   **Python:** The orchestrating language.
*   **Google Cloud AI Platform SDK:** The `google-cloud-aiplatform` library will be used to interact with Vertex AI.
*   **Credentials:** The `Ultiman-cred.json` service account file will be used for authentication.

**Implementation Steps:**

1.  **Create an Extraction Script:** A new script will be created at `services/ingestion-pipeline/extract_knowledge.py`.

2.  **Authentication:** The script will first authenticate with GCP using the service account credentials. The `GOOGLE_APPLICATION_CREDENTIALS` environment variable will be set to point to `Ultiman-cred.json`.

3.  **The Master Prompt:** The script will read the entire `infraon-openAPI.json` file and place its content into a carefully designed prompt for the Gemini 2.5 Pro model. The prompt will be structured as follows:

    ```
    You are an expert software engineer specializing in IT platform APIs and knowledge graph ontology design.
    Your task is to analyze the following OpenAPI 3.0 specification for the Infraon platform.
    
    For every single API endpoint defined in the 'paths' section, you must extract and infer the following key information:
    1.  **Module**: The high-level Infraon module this API belongs to. Use the path prefix (e.g., /ux/sd/, /ux/cmdb/) and your understanding of IT platforms to determine this. Choose from a list of known modules like "ServiceDesk", "AssetManagement", "UserManagement", etc.
    2.  **Entity**: The core business object the API operates on. For example, an API for creating a task operates on the "Task" entity.
    3.  **Action**: The specific action the API performs on the entity. Infer this from the HTTP method (POST -> CREATE, DELETE -> DELETE, GET -> READ) and the summary.
    4.  **Enriched Description**: A concise, natural-language sentence that combines all this information, suitable for a high-quality vector embedding.
    
    Return your analysis as a single, clean JSON array, where each element is an object representing one API endpoint. Do not include any other text or explanations in your response.
    
    Here is an example of the desired output format for a single endpoint:
    {
      "path": "/ux/sd/task/task/",
      "method": "POST",
      "summary": "Creates a new task for an incident.",
      "inferred_module": "ServiceDesk",
      "inferred_entity": "Task",
      "inferred_action": "CREATE",
      "enriched_description": "In the ServiceDesk module, this API creates a new Task entity, typically for an incident."
    }
    
    Now, analyze the complete OpenAPI specification below and provide the full JSON array:
    
    [... The entire content of infraon-openAPI.json will be inserted here ...]
    ```

4.  **API Call to Vertex AI:** The script will send this complete prompt to the `gemini-2.5-pro` model on Vertex AI.

5.  **Save the Enriched Data:** The script will receive the JSON array response from Gemini, parse it, and save it to a new file: `data/enriched_api_spec.json`. This file is the final, crucial artifact of this phase.

---

### Phase 2: Simplified Data Ingestion

**Goal:** To load the clean, pre-processed data from `enriched_api_spec.json` into Neo4j and FAISS.

**Implementation Steps:**

1.  **Rewrite the Ingestion Script:** The `services/ingestion-pipeline/main.py` script will be completely replaced with a much simpler version.

2.  **No More Inference:** The script will contain **zero** complex logic, path parsing, or inference. Its only job is to be a data loader.

3.  **Input:** The script will read the `data/enriched_api_spec.json` file as its source of truth for API data.

4.  **Neo4j Loading:**
    *   It will loop through each JSON object in the `enriched_api_spec.json` array.
    *   It will use a simple, robust Cypher query to `MERGE` the `Module`, `Entity`, and `ApiEndpoint` nodes and their relationships, using the clean data provided. This will eliminate any possibility of the `MERGE` conflicts we previously faced.

5.  **FAISS Indexing:**
    *   It will loop through the array again and use the `enriched_description` field from each object to generate the vector embedding for the API FAISS index.

6.  **PDF Processing:** The logic to process the separate `infraon-user-guide.pdf` will remain in this script, as it is an independent task.

---

This new, two-phase strategy is directly aligned with the vision in `Plan for Ultiman.md`. It uses the right tool for the job: Gemini 2.5 Pro for complex understanding and a simple Python script for reliable data loading.

I am now waiting for your verification of this plan before I proceed with any implementation. 