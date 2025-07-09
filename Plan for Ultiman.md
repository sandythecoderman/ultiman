# Introduction

Infraon’s **MAN-O-MAN** platform is envisioned as an AI assistant that uses *agentic orchestration* and *GraphRAG (graph-based Retrieval Augmented Generation)* to automate tasks across **all Infraon Infinity modules** via natural language commands. Infraon Infinity is a comprehensive IT management suite covering ITSM (incidents, changes, problems, etc.), network monitoring, IT operations, asset management, and more. The MAN-O-MAN system will leverage a lightweight LLM (e.g. a 1–4B parameter model) with a human-in-the-loop for oversight, integrated with a **FAISS vector database** for unstructured knowledge and a **Neo4j knowledge graph** for structured relationships. It will run on Python and utilize GCP Vertex AI services (for model hosting and possibly advanced model APIs like Google’s Gemini). The goal is to allow a user to simply *ask* for an Infraon task (for example, “Create a new user and assign them a role” or “Monitor server X and alert on high CPU”) and have the system plan and execute the required API calls on the Infraon platform, with the knowledge graph and vector store providing the necessary context and routing.

In this report, we develop a comprehensive strategy for building this platform. We address the design of vector databases and knowledge graphs (quantity, scope, and data content), the format and schema of stored knowledge, methods to auto-populate and enrich these knowledge bases using advanced LLMs (e.g. **Gemini 2.5 Pro**), prompt template designs for dynamic context injection, advanced prompting techniques (ReAct, Chain-of-Thought, etc.) to boost a smaller LLM’s performance, and how to pipeline the graph and vector retrieval for optimal query understanding and task execution. Throughout, we will illustrate with Infraon-specific examples (using details from Infraon’s API schema and user guides) and provide an example agent orchestration workflow.

## System Architecture Overview

At a high level, the MAN-O-MAN platform consists of the following components working in concert:

* **Lightweight LLM Agent:** A small-footprint language model (e.g. “Gemma 3” \~4B parameters) serves as the reasoning engine and controller. It is guided by prompt strategies to interpret user instructions, consult knowledge sources, and decide which Infraon API calls to make. A human-in-the-loop can review and approve critical steps.
* **Vector Databases (FAISS):** One or more vector indices store embeddings of Infraon’s textual knowledge (documentation, API descriptions, use-case guides, etc.). These allow semantic **retrieval** of relevant text snippets based on the user’s query. The LLM uses these snippets to ground its understanding and responses.
* **Knowledge Graph (Neo4j):** A graph database encodes **structured relationships** – essentially a domain ontology and dependency graph of Infraon’s modules, components, and their interactions. The graph provides explicit links (e.g. which module a feature belongs to, how modules impact each other, what sequence of steps a task might require) that the LLM can use for reasoning. This addresses the limitation of traditional RAG which treats knowledge as disconnected text and lacks relational understanding. Using a graph brings explainability and multi-hop reasoning: the system can trace how a change in one entity affects others (impact analysis) and maintain context across tasks.
* **Agent Orchestration Layer:** This is the “brain” that uses an agentic framework to coordinate everything. It prompts the LLM in an *interactive loop* (à la ReAct or similar), enabling the LLM to plan actions (“thoughts”) and invoke tools (“acts”) such as querying the vector DB, traversing the knowledge graph, or calling an Infraon API. The orchestrator also manages dynamic context loading (injecting relevant knowledge into prompts) and can enforce guardrails or ask for human confirmation at checkpoints.

By combining these, the platform can handle complex, multi-step workflows. The knowledge graph and vector DB act as complementary knowledge sources: the graph excels at **routing and relational reasoning** (figuring out *which* module or API is relevant and how things connect), while the vector store excels at providing **detailed reference content** (actual API syntax, descriptions, or user guide instructions). The following sections detail the design of these knowledge stores and how they will be used.

# Vector Databases and Knowledge Graphs Design

## Number of Vector DBs and Knowledge Graphs

We propose using **two vector databases** and **one comprehensive knowledge graph** initially (with the option to extend to a second graph for specialized needs in the future). Separating the vector stores by content type will improve precision and manageability from day one, given the breadth of Infraon’s modules:

* **Vector DB 1: Infraon API Knowledge Base.** This will store embeddings of *structured API reference information* – essentially the Infraon OpenAPI schema and API documentation. By isolating API-related texts (endpoints, parameters, example requests/responses), we can efficiently retrieve the exact API call needed for a given user request. For example, if the user asks to “delete a task”, the system will search this vector DB for the *Task deletion API* and find the endpoint (`DELETE /ux/sd/task/task/{id}/` etc.) along with its description. A dedicated API vector index ensures high recall for action-oriented queries and avoids interference from more descriptive content.

* **Vector DB 2: Infraon User Guide and Use-Case Knowledge Base.** This second FAISS index will hold *unstructured documentation*: user manuals, how-to guides, use-case tutorials, troubleshooting articles, and any descriptive content from Infraon’s knowledge base. For instance, Infraon’s user guide sections on various modules (ITSM, asset management, network configuration, etc.) and step-by-step instructions will be chunked and embedded here. This allows the agent to retrieve contextual guidance (“best practices for X”, “steps to configure Y”) when formulating a solution. It covers **use cases** and procedural knowledge that augment the raw API facts from DB1.

Using two vector databases aligns with the distinct information needs: one is task/API-centric and one is explanatory. It also simplifies dynamic context injection – we can decide per query whether to pull from one or both databases. For example, a straightforward query (“Create a new Incident”) might only need API info (from DB1), whereas a complex query (“Set up monitoring for a new branch office and ensure compliance”) might need both API references and a use-case snippet from documentation.

On the graph side, we recommend a **single unified knowledge graph** capturing Infraon’s domain ontology and relationships. All modules are interconnected under the Infraon Infinity platform, so a unified graph can naturally represent cross-module links (like an Incident is related to an Asset CI, or a Network Monitoring alert triggers a Service Desk ticket). A single graph avoids data silos and supports richer multi-hop queries. We will, however, structure the graph with multiple *subsections or subgraphs* by category (see schema below) to keep it organized.

*(If needed later, a second graph could be introduced for dynamic or user-specific knowledge – e.g., a graph of **session context or learned user preferences** – but initially, we focus on the static domain knowledge graph.)*

## Data Scope of Each Knowledge Store

**Vector DB 1 – API Metadata:** This store will contain **all API endpoints and related technical metadata** for Infraon’s modules. It spans every module’s REST endpoints as defined in the openAPI schema (and API documentation). For each endpoint, we’ll embed: the HTTP method & path, a description of its purpose, input parameters, and output format. For example, entries for the *Task* module’s APIs would include “`GET /ux/sd/task/task/` – fetch list of tasks (with pagination params)”, “`POST /ux/sd/task/task/` – create a new task (with payload fields)”, etc. Similarly, we’ll include endpoints for Incidents, Changes, Assets, Monitoring rules, User Management, etc., each with a concise description. This ensures that when the agent needs to perform an action, it can find the correct API call by semantic search (even if the user’s wording differs from the official API naming). **Use case:** If a user says “assign a technician to incident 123”, the vector search on this DB might retrieve the “Update Incident” API or the specific endpoint to assign technicians, thanks to matching on words like *incident* and *technician*. All API calls across Infraon Infinity (ITSM, ITOM, NMS, etc.) from day one are indexed here, providing full coverage of platform capabilities.

**Vector DB 2 – Use Cases & Guides:** This store holds **explanatory and procedural text**. Sources include the Infraon user guides, admin manuals, knowledge base articles, and any “step-by-step” use-case documentation. Each document is chunked (e.g., by section or paragraph) and enriched with metadata tags for module/topic. Key content here: *module overviews*, feature explanations, configuration steps, examples of common workflows, and any best practices. For instance, the user guide’s section on “Infraon Configuration module” (which covers settings like business hours, tag management, etc.) would be embedded. Another example is guides for enabling SNMP monitoring on network devices or setting up an ITSM workflow. This DB helps answer **clarification questions and context**. If the user’s request is ambiguous or high-level, the agent can retrieve a snippet explaining the relevant concept. E.g., if asked “How do I ensure an incident gets escalated after 2 hours?”, the agent might pull a paragraph on SLA and escalation rules from the ITSM handbook, to better understand or confirm the approach before selecting an API.

**Unified Knowledge Graph – Infraon Domain Ontology & Relationships:** The Neo4j graph will encode several kinds of nodes and edges to model Infraon’s system:

* **Module and Sub-module Hierarchy:** Each top-level Infraon module (ITSM, Asset Management, Network Monitoring, NCCM, Configuration, etc.) is a node. Under them, important sub-modules or feature categories are connected via *“has\_submodule”* or *“part\_of”* relationships, forming a hierarchy. For example, the graph would have a node for **“NCCM (Network Configuration & Change Management)”**, with edges to nodes like “Configuration Download”, “Configuration Upload”, “Baseline Manager”, etc., which are sub-components of NCCM. Similarly, the **Service Management** module (ITSM) would connect to nodes like “Incident Management”, “Problem Management”, “Change Management”, “Service Catalog”, etc.. This hierarchical ontology provides the agent an **overview of all functionality** and the relationships “Module X includes Y”, enabling it to route queries to the right area.

* **Entities and Domain Objects:** Key entities within modules will be nodes, linked to their module. For instance, “Incident”, “Task”, “Service Request” would be nodes linked under the Service Desk/ITSM module; “Asset”, “Asset Inventory” under Asset Management; “Device Monitor” or “Alert Rule” under Monitoring, etc. These might further link to each other if relevant (e.g., an “Incident” node might have a relationship *“related\_to”* an “Asset” node if incidents can be tied to configuration items). **API endpoints** themselves can also be represented as nodes or attributes attached to these entities. For example, the “Create Incident API” could be a node linked to the “Incident” entity node with a relation *“implements\_action\:Create”*. This way, given an entity and desired action, the graph can point to the corresponding API.

* **Inter-module Interactions (Impact Propagation):** A crucial part of the graph are edges that represent **dependency or impact relationships** between different modules’ components. Infraon’s modules do not live in isolation – for example, a network device (Asset) being down might trigger an “Alert” in the monitoring module, which could create an “Incident” in ITSM. We will encode such relationships: e.g., *Asset –“monitored\_by”→ MonitoringRule*, *MonitoringRule –“triggers”→ Alert*, *Alert –“creates”→ Incident*. These edges allow the agent to trace how an action in one domain affects others. If a user asks to “stop all alerts for a decommissioned server”, the graph can help identify that the server is an Asset which has monitoring rules that generate alerts (so the agent knows it must call both the asset removal API and disable related monitoring rules). Traditional RAG would struggle with this kind of multi-hop inference, but our graph makes the relationships explicit. By traversing the *impact graph*, the agent can perform **causal reasoning and dependency checks** (e.g., “if I change X, also inform Y and Z modules”). This supports robust automation and prevents unintended side effects.

* **Keyword and Synonym Associations:** To bridge natural language to Infraon’s terminology, the graph will include *alias/keyword nodes*. These are connected to the relevant formal entities. For instance, the keyword “ticket” might link to the “Incident” node (since users might say *ticket* for an incident record). “Change request” might alias to the “Change Management” module or “Change” entity. Even acronyms (like CI for Configuration Item, NCCM for network config module) can be nodes linking to their full term. When the user’s query contains such terms, the agent can quickly resolve them via the graph connections. These *“alias”* relationships act like a thesaurus, improving understanding and routing. They effectively augment the vector semantic search with a deterministic mapping for known important terms.

* **Usage and Sequence Knowledge (Optional):** We may also encode typical **workflow sequences** as a simple graph of actions. For example, a *“New User Setup”* node could be connected to a sequence: “Create User” -> “Assign Role” -> “Add to Group”. This would be extracted from use-case documentation. Such a *task graph* helps the agent plan multi-step procedures by providing a template of subtasks for common goals. In Neo4j, this could be a chain of nodes with *“next\_step”* relationships. While not strictly necessary (the LLM can also reason this out), having it in the graph offers a knowledge source for the agent to verify its plan or to ensure it doesn’t forget a step (especially useful for complex multi-module workflows).

In summary, **one knowledge graph** houses a rich, interconnected ontology of Infraon’s system – from high-level modules down to specific API nodes – along with cross-module links and alias mappings. This single graph provides a **network of meaning** that the LLM can traverse for deeper reasoning, instead of treating facts as isolated.

# Data Formats and Schema

Designing the right data format is essential for these knowledge bases to be effective. We need formats that are both *machine-friendly* for retrieval and *LLM-friendly* when injected into prompts. Below we propose the formats for each:

## Vector Database Entries Format

Each entry in the vector DB will be stored as a **text chunk with metadata**. We will use a consistent template for the text to maximize retrievability and clarity. Two different templates will be used corresponding to the two vector databases:

* **API Vector Entry Format:** We will create a textual representation of each API endpoint that includes key info: the endpoint’s **name, method, path, purpose, and important parameters**. For example, an entry might look like:

  *Text:* “**Infraon ITSM – Task Module – Delete Task API:** `DELETE /ux/sd/task/task/{id}/` – Deletes the task with the given ID. *Required:* Task ID in URL. *Description:* Marks the specified task as deleted in the Service Desk module.”

  *Metadata:* `{ "module": "ITSM-ServiceDesk", "entity": "Task", "action": "Delete", "api_path": "/ux/sd/task/task/{id}/" }`

  This format places the module and feature up front (for readability and search cues), then the method/path, followed by a brief plain-language description. The description is drawn from the API docs or OpenAPI comments. We include key requirements (like required IDs or payload fields) in the text if important. The metadata attached to the embedding (FAISS can store an ID or metadata blob alongside vectors) labels the module, entity, etc. – enabling filtered searches (e.g., only search within “Asset Management” APIs if we’ve identified that domain from the query). By embedding this structured summary as a chunk, semantic search will catch both user phrasing and formal terms. For instance, if a user says “remove asset”, the vector search will match an entry like “Asset Module – Delete Asset API: DELETE /asset/{id} – Deletes an asset…”.

* **Documentation Vector Entry Format:** Here each entry corresponds to a paragraph or section from Infraon’s guides. We will preserve a bit of context in each chunk to help the LLM understand it. The format: a **title or heading context** followed by the paragraph text. For example, an entry could be:

  *Text:* “**Incident Management – Prioritization:** Infraon allows you to set priority levels on incidents. Administrators can define SLA targets for each priority; for example, a *High* priority incident might have a 4-hour resolution target. The priority also influences alert escalations…”

  *Metadata:* `{ "module": "ITSM-Incident", "section": "Prioritization", "source": "UserGuide" }`.

  We include the section title (or a constructed title if the text is from a multi-step list) in bold as part of the text. This helps both in retrieval (the embedding captures the topical keywords) and in prompting (the LLM sees a clear context of what the snippet is about). Any lists or stepwise instructions in the docs will be kept in bullet/numbered form in the text. We will also add references such as *Infraon UI terms* if relevant (e.g., if the guide says “go to Infraon Configuration -> General Settings -> API Registration”, we ensure those UI terms are in the text chunk so the LLM can connect it to the action).

  Each such chunk ideally is \~50-150 words to stay within a manageable token size, and overlaps slightly with adjacent chunks to avoid losing context. The metadata allows narrowing by module or document section if needed.

By using these formats, the **vector entries are essentially long descriptive sentences or short paragraphs** with rich keywords, which the LLM can easily digest when inserted into prompts. They combine clarity (for human/LLM reading) with completeness (so the LLM doesn’t need the entire doc, just the relevant chunk).

## Knowledge Graph Schema and Ontology

We will design the Neo4j graph with a **clear schema** using labels for node types and relationship types. Here’s a summary of the ontology and data representation:

* **Node Types (Labels):** We will have labels like `Module`, `Submodule`, `Feature`, `Entity`, `API`, `UseCase`, `Keyword`. In practice, some of these overlap (e.g. a submodule might be just a Module node with a parent). Key ones:

  * `Module`: top-level product areas (ITSM, ITOM, NMS, AssetMgmt, etc.). Example: a node with `name="IT Service Management (ITSM)"` labeled Module.
  * `Feature`/`Submodule`: significant components within modules. We might reuse the `Module` label for all hierarchical levels, distinguished by a property or relationship. For clarity, we could label them `ModuleLevel2` etc., but simpler is to use `Module` for all and connect them in hierarchy. For example, “Incident Management” node could be a Module node with property `level=2` and relation to parent “ITSM”.
  * `Entity`: key data objects or concepts (Incident, Task, User, Asset, Device, Alert, etc.). These often correspond to nouns in the system. They will have relations like *“belongs\_to”* a Module or Feature (e.g., Incident *belongs\_to* Incident Management module).
  * `API`: individual API endpoint definitions. These nodes could have properties like `method`, `path`, and a short description. They link to the entities or features they operate on via relations like *“performs”* or *“implements”*. For instance, a node `DeleteTaskAPI` linked to `Task` entity with *implements\_action="delete"*.
  * `UseCase`: optional nodes representing a multi-step use-case (like “Onboard New Employee” or “Backup Network Config”). These would link to multiple features/entities in sequence. (This is an advanced addition and may be populated gradually.)
  * `Keyword`: nodes for synonyms or alternate terminology (could also cover acronyms). Properties might include `term`.

* **Relationship Types:**

  * Hierarchical relations: `HAS_SUBMODULE` or `PART_OF` – linking Module ↦ Submodule, Module ↦ Entity (if the entity is a fundamental part of the module). E.g., `ITSM HAS_SUBMODULE IncidentManagement`, `IncidentManagement HAS_ENTITY Incident`.
  * Dependency/Impact relations: We’ll use descriptive types like `TRIGGERS`, `DEPENDS_ON`, `AFFECTS`, `RELATES_TO`. For example, `MonitoringAlert TRIGGERS Incident` (meaning an alert can trigger an incident), or `Asset DEPENDS_ON MonitoringAgent` (if a software agent on asset is needed for monitoring). These edges might be directed and can carry a property like `impact="high"` to indicate critical dependencies. This part of the schema will be informed by analyzing Infraon’s modules (e.g., knowing that the Service Desk module can create tasks or incidents based on events from the monitoring module).
  * Action/API relations: `HAS_API` to link an Entity to its API(s), or more specifically `CREATED_BY`/`UPDATED_BY` to link an entity to the API that creates it, etc. For instance, *Incident* –\[`CREATED_BY`]→ *CreateIncidentAPI*. This explicitly ties the knowledge of “to create an Incident, use this API”.
  * Alias relations: `ALIAS_OF` to connect a Keyword node to the official node. E.g., *“Ticket”* –\[`ALIAS_OF`]→ *Incident*. These will often be one-to-one links, possibly many keywords to one target.
  * Sequence relations (for use-cases): `NEXT_STEP` to order a series of actions (if modeling procedural flows in the graph).

* **Data Encoding:** Each node will have a `name` and a few key properties (like a Module node might have a `description` summary drawn from documentation, an API node has `path`, `method`, etc., an Entity node might have a `description` or relevant attributes). The graph data can be seeded by parsing the OpenAPI spec and documentation: for example, we create an API node for each path in the spec (we can use the JSON file to script this). We also create Module and Entity nodes from a predefined list (Infraon Infinity’s modules as gleaned from docs). The relationships are either known (we know from docs which entity belongs to which module) or can be inferred by scanning text (for dependencies, we might rely on the one-time LLM analysis described later).

* **Ontology Example:** To make this concrete, consider the **Task entity** in Service Desk:

  * Nodes: `ServiceDesk (Module)`, `Task (Entity)` with a relation `Task BELONGS_TO ServiceDesk`.
  * APIs: `ListTasksAPI`, `CreateTaskAPI`, `DeleteTaskAPI` nodes linked to `Task` with `HAS_API` (or `LISTS`, `CREATES`, `DELETES` relations respectively). Each API node has properties like `method="GET"`, `path="/ux/sd/task/task/"` for list, etc..
  * Interactions: Task might relate to Incident (maybe tasks can be part of incident workflow) – so maybe an edge `Task RELATED_TO Incident` if applicable.
  * Keywords: “to-do” or “ticket task” could alias to Task if users use those terms.

  Now if the user asks a question, e.g. “What happens if I delete a task linked to a change request?”, the agent could traverse: Task –RELATED\_TO→ Change (if such link exists) and see implications. The vector DB might not directly give that relational insight, but the graph would.

The knowledge graph essentially acts as a **knowledge schema** or ontology for Infraon. By storing it in a graph database, we can use graph queries (via Cypher or an API) to fetch subgraphs relevant to a query. For example, if the user query mentions a “Change task”, we can query the graph for nodes matching “Change” and “Task” and find their connection. This structured data can then be fed into the LLM prompt in a serialized form (like a series of triples or a text summary of relationships).

We will maintain the graph in Neo4j, which supports complex queries and graph algorithms if needed. The **hierarchical ontology** ensures context: e.g. the LLM can be told explicitly *“Incident is a part of ITSM and is related to Assets”*, rather than expecting it to infer that from text alone. This structured grounding reduces ambiguity and hallucination, as the LLM’s answers can be tied to known relationships.

# Auto-Population and Enrichment Strategy (using Advanced LLMs)

Manually building the knowledge graph and vector DB for *all* Infraon modules would be laborious and error-prone. Instead, we will leverage a powerful LLM (such as **Google’s Gemini 2.5 Pro**) to **automate the population and enrichment** of these knowledge bases. This is largely a one-time (or periodic) setup process, so we can afford to use a large model for higher quality output. The strategy consists of several steps:

1. **Parsing the OpenAPI Schema (Automated):** We will write a script (Python) to parse the `infraon-openAPI.json` file (and any API documentation) to extract all endpoints, group them by module, and generate initial content for Vector DB 1 and the API portions of the graph. For each endpoint, the script can gather the method, URL path, summary, and parameters. This is mostly straightforward data extraction. The result will be:

   * A list of formatted API descriptions to embed (as per the format above).
   * Creation of API nodes in the graph with appropriate properties.
   * Creation of Module and Entity nodes if not already (the OpenAPI may have tags or sections indicating the module, e.g., endpoints starting with `/ux/sd/task/...` clearly belong to ServiceDesk-Task, etc.). For example, from the snippet we saw, endpoints under `/ux/sd/task/` relate to the Service Desk Task management, whereas something like `/ux/cmdb/asset/...` might indicate Asset management. We will use naming conventions and the documentation structure (which likely groups endpoints by module) to assign each API to a module node and relevant entity node.

   This automated step ensures **100% coverage of APIs** and accurate technical details in our knowledge bases.

2. **Ingesting Documentation into Vector DB (Semi-automated):** We will take the Infraon user guide (PDF provided) and any other docs (perhaps the online docs for Infraon Infinity) and feed them into an ingestion pipeline. This involves extracting text (from PDF, HTML, etc.), segmenting into sections, cleaning (removing extraneous headers/footers), and then chunking into pieces for embedding. An advanced model like Gemini 2.5 Pro can assist by summarizing or expanding sections if needed: for example, if a section is too terse, we might prompt Gemini to *“explain this configuration setting in one paragraph”* and store that explanation as well. However, a more straightforward approach is to directly embed the original text chunks. The enrichment from Gemini can come in the form of generating **metadata or tags**. For instance, we could prompt Gemini with something like: *“Given the following documentation excerpt, list which Infraon modules and features it mentions, and any dependencies implied.”* This could yield tags that we attach as metadata or even use to create graph relationships. For example, if a doc excerpt says “After creating a change request, an approval task is sent to the user”, the model might output: *Modules: Change Management, Task; Relationship: Change requires Task approval*. We could then feed that into the graph (linking Change and Task nodes with an “approval” relation).

3. **Knowledge Graph Construction via LLM (One-time inferencing):** Building the full relationship graph from scratch is challenging. Here we harness **Gemini 2.5 Pro’s reasoning and massive context window**. Gemini 2.5 Pro is described as capable of comprehending *vast datasets and complex problems across multiple sources (text, code, etc.)*. We can use it to extract a structured knowledge graph by prompt-engineering it on the documentation. One method: use Gemini in an iterative process where we ask it to enumerate the key entities and their relationships. For example:

   * Prompt it with the list of Infraon modules (obtained from docs) and ask it to detail sub-components and interactions: *“Infraon Infinity has modules X, Y, Z. Please list each module’s main components or features and how they interact with other modules.”* The output can be parsed into relationships for the graph.
   * Then for each module, feed relevant documentation sections and ask for a summary of *relationships within that module* (e.g., “What entities exist in ITSM and how do they relate (incidents, problems, tasks…)?”).
   * Ask specifically about cross-module dependencies: *“Do any processes in module X involve module Y?”*. For instance, *“Does Infraon’s Network Monitoring have the ability to create tickets in Service Desk?”* The model, if it has read the docs, might answer yes and describe it. If the docs aren’t explicit, we can use logical assumptions or ask Infraon SMEs, but Gemini’s advanced reasoning might infer typical integrations (and we’d verify these).

   While using an LLM to build a KG is cutting-edge, it aligns with GraphRAG practices of using **machine-inferred entity relationships**. We will validate the critical relations (especially anything driving automation decisions) with domain experts or testing. Gemini’s outputs can serve as a *draft graph ontology* which we refine. Once confirmed, we import these nodes and edges into Neo4j.

4. **Enriching with External Knowledge or Best Practices:** If available, we could also feed Gemini 2.5 Pro some *general ITSM/ITOM knowledge* to enrich understanding. For example, if Infraon docs don’t explicitly say that “an Incident’s priority impacts its SLA timers”, we know from ITIL best practices that’s likely true. The knowledge graph could benefit from such common-sense or industry knowledge. This might be out of scope, but it’s a possibility to future-proof the system’s reasoning by not limiting strictly to literal documentation. Gemini, being state-of-the-art, could incorporate such knowledge either via prompting or its own pretraining.

5. **Vector Embeddings with Advanced Models:** Once content is prepared, we generate embeddings. Since we have access to Vertex AI, we might use a high-quality embedding model (like `text-embedding-ada-002` from OpenAI or any similar state-of-the-art model available on Vertex) to embed our text chunks. This ensures the semantic search is accurate. (If Vertex AI’s **RAG Engine** is used, it can handle the vector store and retrieval in an optimized way, but we can also roll our own with FAISS).

6. **Testing and Iterative Refinement:** After auto-population, we’ll run a set of test queries across modules to see if the retrievals and graph traversals make sense. For example, test query: “Create an incident for device XYZ”. The expected pipeline: graph identifies *device* as Asset module and *incident* as ITSM module, vector DB finds *Create Incident API* and maybe *Link Incident to Asset* info. If something is missing (say the graph didn’t know that linking an asset is possible), we identify the gap and update the graph or add a doc snippet. This iterative tuning will likely be needed initially.

Using **Gemini 2.5 Pro** (or an equivalently powerful model) is key for one-time setup because it can handle long documents (it supports up to 1M tokens input, which is extremely large) and has advanced reasoning to connect dots. Its “enhanced thinking and reasoning” capabilities mean it can likely derive relationships and fill in missing links better than a smaller model. We only need to do this heavy lifting once (and perhaps occasional re-runs when Infraon updates its platform). After that, the lightweight on-prem LLM can rely on the prepared knowledge.

In summary, **auto-population** will combine programmatic extraction (for straightforward data like API specs) and **LLM-driven analysis** (for extracting relationships and summarizing docs). This ensures comprehensive, rich knowledge bases from day one, covering all of Infraon Infinity’s modules. The use of an advanced model for setup provides a quality boost – e.g. more complete ontology, well-phrased descriptions – which directly improves the performance of the runtime system by giving it better grounding.

# Prompt Template Design with Dynamic Context Loading

Designing effective prompt templates is critical to get the most out of a smaller LLM and to integrate the external knowledge dynamically. We will use a **modular prompt structure** with clearly delineated sections for context and query, so that the LLM can differentiate its knowledge sources. The prompts will be constructed at runtime by pulling in relevant context from the vector DB and knowledge graph based on the user’s request.

Key considerations for the prompt design: it should provide **instructional guidance**, the **retrieved context (both textual and structured)**, and allow the model to output not just answers but potentially a **sequence of actions** (when using agentic prompting). We also want to avoid overwhelming the LLM with too much context – dynamic selection of only the most relevant pieces is crucial.

A recommended prompt template (in a pseudo-code format) is as follows:

```
[System Role Instructions]: 
"You are Infraon-MAN-O-MAN, an intelligent assistant for the Infraon platform. 
You have access to Infraon's API and documentation. 
Follow the steps: understand the request, plan the solution, and output the actions or answer. 
If an action is required, produce the steps and required API calls. 
Use the provided context and do not hallucinate unsupported features."

[Knowledge Graph Context]: 
(Here we insert a summary of relevant graph info, if any was retrieved. 
This could be in a textual form like:
 'Knowledge: Incident belongs to ServiceDesk module; Incident has relation to Asset via CI field; Use createIncident API to create incidents.' 
Or a set of triples:
 '- Incident – part_of – ITSM.ServiceDesk 
  - Incident – related_to – Asset (via CI) 
  - CreateIncidentAPI – creates – Incident'
)

[Document Excerpts]: 
(Here we insert 1-3 most relevant chunks from the vector DBs, each clearly quoted or delineated. 
For example:
 'Doc1: Infraon API Guide - Create Incident: POST /ux/sd/incident/ ... (required fields: title, description, asset_id) ...' 
 'Doc2: Infraon User Manual - Incident Management: "Incidents can be linked to Configuration Items (assets) to track affected devices..."'
Each excerpt will be prefaced by a brief source label as shown, so the LLM can reference them.)
 
[User Query]:
"<the user’s exact request in quotes>"
```

Finally, we might add a brief **prompt to the LLM**:

```
"Using the above information, generate a step-by-step solution or answer. 
First, think about which module and API calls are needed (you can list them), then provide the final action or answer."
```

A few important points about this template design:

* We separate the **system role** instructions from the data. The system message establishes the LLM’s role, capabilities, and any high-level guidance (like not to stray from provided info). This helps align the model’s behavior. For instance, instructing it not to hallucinate and to rely on context should reduce wrong answers.
* The **graph context section** is where we incorporate structured knowledge. We have flexibility in format here. One approach is to convert the relevant portion of the knowledge graph into natural language sentences or a bullet list. For example, if the user query is about an incident, we might include: *“Incident Management is part of Infraon’s ITSM. Incidents can be linked to Assets (from Asset Management). To create an incident via API, a POST request is used.”* This can be derived from graph queries like (Incident node, its parent module, related entities, and linked API node). By doing this, we give the LLM a **pre-digested summary** of the graph’s output, which it can easily read in the prompt. Another approach is to include triples or JSON, but that might be harder for the LLM to interpret reliably unless it’s been trained or fine-tuned for it. Since we are using a relatively small model, keeping the format simple (natural language or simple lists) is safer.
* The **document excerpts section** will contain the raw text snippets from the vector retrieval. We will likely prefix each snippet with a tag (Doc1, Doc2, etc.) and possibly the source, but we must be careful the model doesn’t just copy them verbatim as answer. The instructions should clarify that these are reference. We also keep snippets concise and relevant (few sentences each) to avoid overflow. Dynamic loading means if the query is about a specific module, we filter our vector search to that module’s content to retrieve the top matches. E.g., user asks about “SLA on incidents” – we search the docs index for “incident SLA” and include the best hit (perhaps a user guide paragraph on SLA). If the query is an action request, we search the API index for the relevant API and include that. If it’s multi-part, we might include one snippet per part. The orchestration logic will handle these decisions.
* We explicitly echo the **user query** at the end of the context. This helps focus the model’s attention on the actual question after reading all the context. It serves as a prompt for the answer (especially useful in a single-turn setting).
* Notice we encourage a *step-by-step solution* in the prompt. This primes the model to produce a structured reasoning or plan (we’ll discuss more in prompting strategies next). For example, the model might output: “1. Identify module... 2. Use API X... 3. Confirm result... – Done.” This can then be executed or presented.

We will craft variations of this template for different interaction styles. For instance:

* A **“planning prompt”** template might omit the final answer request and instead ask the model only to output a plan of actions (which the system then executes one by one).
* A **“QA prompt”** might be simpler when the user just asks a question (not an action), in which case the prompt might say “Answer the question using the documentation above”.

The templates will also be tuned with **few-shot examples** where possible. For dynamic loading, few-shot examples (like example user queries and agent reasoning) can be included in the system prompt or early in the user prompt to guide the model. For instance, we may include a small demonstration:

```
Example:
User Query: "Add a new user and assign them the Admin role."
Knowledge: User Management is part of Infraon Platform; Roles define user permissions.
Docs: "POST /user-management/users – Create user..."
Assistant reasoning: 
1. Use Create User API to add the user.
2. Use Assign Role API to grant the role.
Assistant final: "Step 1: [calls CreateUser]; Step 2: [calls AssignRole] ...".
```

This shows the model how to behave. These examples would be dynamically chosen to match the query type if possible (and kept minimal to save tokens).

In summary, the prompt design emphasizes clarity, separation of knowledge sources, and guiding the LLM through the context. The **dynamic context loading** process is: the orchestrator analyzes the query (possibly with a first-pass on the graph to identify key modules/entities), fetches relevant graph info and top vector hits, then fills the template and sends it to the LLM. This way, the LLM always works with up-to-date, query-specific information. It helps mitigate the small model’s limited knowledge by *feeding it exactly what it needs to know* at query time.

# Advanced Prompting Strategies for a Lightweight LLM

Given the LLM we use is relatively lightweight (far smaller than GPT-4 or Gemini), we need to employ advanced prompting techniques to boost its performance on complex tasks. The strategies include prompting methods like **ReAct (Reason + Act)**, **Chain-of-Thought (CoT)**, **Tree-of-Thought**, and self-reflection, many of which have shown to significantly enhance reasoning and decision-making abilities of LLMs. We will incorporate these as follows:

* **ReAct Prompting (Reason + Act):** We will implement the ReAct paradigm in the agent orchestration. ReAct prompts the model to intermingle *thoughts* (natural language reasoning about what to do) with *actions* (commands to use a tool or call an API). For our use case, the “tools” are: graph queries, vector searches, and actual Infraon API calls. The prompt format would encourage the model to first output a reasoning like: “I need to retrieve the user’s info. I will call the User Management API.” and then output a pseudo-action like `CALL getUser(123)`. The orchestrator intercepts this, executes the real API, and returns the result to the model, which then continues reasoning. This iterative thinking-acting cycle continues until the task is done. By explicitly prompting the model to *think step-by-step and decide on actions*, we help the small LLM overcome its limitations in multi-step tasks. ReAct has been shown to allow even moderately sized models to handle more complex problem solving by offloading some reasoning into the sequential process. We will use a format similar to:

  ```
  Thought: I should check if the server exists. 
  Action: CALL AssetAPI.getServer("Server123") 
  ```

  and so on. The final answer might be produced after a series of Thought/Action loops. This not only breaks the problem into manageable chunks but also makes the process **interpretable** (we can log the chain of thought, which is useful for debugging and human oversight).

* **Chain-of-Thought (CoT):** Even outside the context of tool use, we will utilize CoT prompting to encourage the model to **reason internally**. For direct question-answering or planning, we might instruct the model to “think step by step” or provide an example of a stepwise reasoning in the prompt. For example, if asked “How can I monitor a new device and ensure it’s included in nightly reports?”, we want the model to break this down: *(1) device needs to be added as an asset, (2) a monitoring rule should be created or enabled, (3) ensure the reporting schedule includes this device.* By showing a chain-of-thought process in few-shot examples or by using an intermediate step where the model outputs a numbered list of reasoning, we can get more structured responses. CoT prompting has famously improved large models’ performance on math and logic tasks, and while smaller models benefit less strongly, giving the instruction to reason stepwise usually doesn’t hurt and often helps clarity. We will monitor if the CoT style improves the accuracy of the small model’s planning. We may use a two-phase approach: first ask the model “provide your reasoning”, then “now give the answer based on that reasoning” to explicitly separate the phases if needed.

* **Tree-of-Thought (ToT):** This is a more experimental strategy where the model explores multiple reasoning paths (like a search tree) and we evaluate the outcomes to choose the best. Implementing true ToT might be heavy, but we can approximate it. For instance, if the query is very complex or ambiguous, we could prompt the model to suggest 2-3 different possible approaches, then either let a heuristic or another model (or human) choose the best path to execute. This could be done by prompt like: “Outline two different ways to achieve this task.” Gemini 2.5 Pro (during setup or oversight) could also be used as a *critic* or *planner* to evaluate the small model’s plan, akin to a Tree-of-Thought where branches are validated. This aligns with the idea of an agent with a **critic module** – the small LLM produces a plan, and a larger model (or the same model with a different prompt) reviews it for consistency or errors before execution. If an error is found, the small LLM can be prompted to “reflect and revise” its plan (a form of self-reflection to improve actions). We will incorporate simple self-checks: after the model outputs a plan, we might ask it (or another instance of it) “Are there any steps missing or any potential issues?” This reflection can catch mistakes early.

* **Few-Shot and Role Prompting:** We briefly touched on few-shot examples. By providing exemplars of successful task automation dialogues, we guide the model on style and strategy. We will ensure some examples show ReAct style thinking, some show CoT, so the model knows it’s expected to reason. We will also use *role prompting*, e.g., sometimes prefix the model’s thoughts with a persona like “\[Planner]: …” and actions with “\[Executor]: …” to delineate planning vs execution roles. In an orchestrated framework, the “planner” and “executor” could even be separate agents (with the same model or different sizes), which is a known approach to improve reliability (multi-agent collaboration). For now, we can simulate that with prompting in one model by having it label parts of its output.

* **Guardrails and Checks:** Because we have a human in the loop and an orchestrator, we can implement advanced prompting where after the model proposes an action, the orchestrator can insert a system prompt like “Are you sure? Verify if all required data is present.” This is a simple form of an **automatic guardrail agent** that forces the model to double-check. The model then either confirms or adjusts. This dynamic insertion of prompts is another strategy (sometimes called sandwich prompting or reflective prompting).

These techniques collectively aim to **boost the reasoning ability and reliability** of the solution. Agentic orchestration in particular benefits from such strategies: for example, the **Agent-G framework** for GraphRAG uses self-reflection to improve the agent’s actions and adaptivity for hybrid knowledge. Industry implementations like NeoConverse have shown that chaining a vector search with a graph query requires an agent to coordinate multiple steps, which our ReAct-style prompting will achieve (the agent will decide “first do vector search, then graph traversal”).

Furthermore, advanced prompting helps mitigate the size limitation of the LLM. We compensate for what the model lacks in parameters with clever prompting and external knowledge. Instead of expecting the model to “figure everything out” in one go, we break tasks down (CoT/ReAct) and leverage the knowledge bases heavily (RAG). As a result, even a 4B model can perform tasks that seem complex, because it’s guided to do so in increments with the right information at each step.

# Integrating Knowledge Graph and Vector DB for Retrieval & Routing

One of the most important aspects of this system is how the **knowledge graph and vector database work in tandem** to help the agent understand queries and fetch relevant info. We design a pipeline where each component plays to its strengths, enabling optimal retrieval and correct “routing” of the query to the relevant modules and APIs. Below is the strategy for aligning and pipelining these resources:

1. **Query Understanding via Graph (Routing):** When a user’s request comes in, the first step is to interpret it in terms of Infraon’s domain. The knowledge graph is queried to identify which parts of the platform the request involves. This typically means extracting the key entities and modules mentioned (explicitly or implicitly). For example, if the user says: *“Disable monitoring alerts for server ABC during maintenance”*, we parse out keywords “monitoring alerts” and “server”. We query the graph for those terms:

   * “server” likely maps to an Asset (in Asset Management).
   * “monitoring alert” maps to the Monitoring module (NMS) and specifically to an Alert or Rule entity.
     The graph might reveal a relation: Asset –monitored\_by→ MonitoringRule –triggers→ Alert. Thus, both the Asset Management and Monitoring modules are involved, and specifically the entities Asset, MonitoringRule/Alert. This graph traversal gives a structured understanding: *the task is to disable alerts for a specific asset.*

   In practice, this could be done by a combination of full-text search on node names and relation queries in Neo4j (the agent or a tool can perform something like a fuzzy match or use an index on the graph for keywords like “alert”). Because we stored alias and synonym links, even if the user doesn’t use exact Infraon terms, the graph helps map them (e.g., “server” → “Asset”, “alerts” → “Alert Rule/Event”). This **routing step** narrows down the scope of the problem. It answers: *which module(s) should handle this request? which entity or API is likely needed?* This guides subsequent retrieval.

2. **Targeted Vector Retrieval (Context Injection):** Based on the graph output, we then hit the vector databases with targeted queries. Knowing the scope (say, Asset module and Monitoring module in the example), we can filter or prefer documents from those domains. Specifically:

   * We’d query the API vector DB for relevant endpoints. E.g., search for “disable alert” within the Monitoring API entries. This might retrieve an endpoint like “PATCH /monitoring/alerts/{id}/disable – Disable an alert rule.” If the query is more abstract like “server maintenance”, maybe the API search yields “Maintenance window API” if one exists, or if not, we find related endpoints (could be none, then the plan might be to temporarily mute alerts, etc.).
   * We’d also query the documentation vector DB for any guidance on maintenance mode or disabling alerts. Perhaps there’s a knowledge base article “How to silence alerts during maintenance” – the search could surface that if present.
     Because the graph already pinpointed key terms (asset, alert, maintenance), those become search terms (possibly expanded with synonyms). The retrieval is therefore more precise than a blind search on the whole corpus. This reduces noise – a known issue with pure vector similarity is it might return contextually irrelevant but lexically similar content. By constraining by module via graph context, we avoid, say, getting results about “alert” in a different sense (like an “alert” in an audit log, which might be unrelated).

3. **Combined Context Delivery:** We then combine the outputs: the graph’s structured info and the vector-retrieved snippets are assembled into the prompt (as described in the prompt design). This combined context ensures both **breadth and depth**: breadth from the graph (overview of all related pieces) and depth from documents (specific details to execute the task). The GraphRAG approach inherently leads to this richer context. As an example, continuing with the alert scenario, the prompt might contain:

   * Graph context: “Asset ABC is monitored by AlertRule X. Disabling alerts likely involves the Monitoring module’s API.” (Perhaps even an explicit relationship: `AlertRule –belongs_to→ Monitoring module`.)
   * Doc snippets: the exact API call format to disable an alert, and maybe a note from docs: “Alerts can be muted by updating their status via the API” from a user guide.

4. **Agent Reasoning and Action (Pipeline Execution):** With this context, the LLM agent formulates a plan. Thanks to the graph, it knows *two steps* are needed: one to find or identify the alert rule associated with that server, and another to disable it. It might do something like:

   * Thought: “I should find the alert rule for server ABC. That likely means find the asset’s ID and then find alerts referencing that asset.”
   * Action: Calls an Asset API to get the asset ID or directly search alerts by asset (depending on API availability). This step might require going back to the vector DB if needed (but ideally our initial retrieval gave the needed API info, e.g., “GET /alerts?asset\_id=XYZ”).
   * After getting the alert ID, next Thought: “Now disable this alert.”
   * Action: Calls the disable alert API.
     This chaining is orchestrated by the agent loop. The important point is the knowledge graph *informed the control flow*: it aligned the two domains (Asset and Monitoring) and the dependency (which to do first). Without the graph, the LLM might not realize it needs to involve the asset at all. With graph guidance, it knew the alert was tied to the asset. This reflects how GraphRAG provides more **grounded, accurate routing of queries to relevant operations**, preventing mistakes like using the wrong data or forgetting a step.

5. **Parallel or Multi-Modal Retrieval (if needed):** In some cases, we might retrieve info from multiple sources in parallel. The agent can decide to query the vector DB or graph at different points. For instance, if a query is very broad (“Generate a weekly report of all open incidents and network outages”), the agent might first ask the graph “what does this entail?” Graph might say: involves Incident module and NMS events. Then the agent might simultaneously fetch the Incident report API and the NMS outage API from the vector DB. Our system should support multiple retrievals. Neo4j’s ability to do vector searches itself (via GDS plugins or indexes) can even combine steps – but a simpler way is to do them separately. The *agent dynamically chooses which retrieval to invoke based on the query*, similar to how NeoConverse’s agent picks tools on the fly. In our case, the orchestrator can be hard-coded to always do a graph query first, then a vector query. Alternatively, a more advanced approach: have the LLM decide, as in “if the user query explicitly names a module or looks like a known command, maybe vector search first; if it’s ambiguous or cross-domain, do graph first.” Over time, analytics on user queries could refine this pipeline. Initially, a fixed order (graph→vector) is fine and safe.

6. **Graph for Verification and Memory:** After executing actions, the results could even be fed back into the graph as new facts (for long-term memory). For example, if a new user was created, a node for that user could be added or the count of users updated. While not required, this shows how the pipeline can also update the knowledge graph, giving the agent persistent memory of changes (solving the statelessness of traditional RAG). This is more for future extension; initially we focus on retrieval.

To illustrate alignment with an example: consider a user asks *“Give me the status of all tasks related to Change Request CR-1005.”* This is complex: it involves the **Change Management** module and the **Task** entity (likely in ITSM). The pipeline:

* Graph step: Find that *Change Request* (node) is related to *Task* (node) via something (maybe tasks can be children of a change). The graph says: ChangeRequest –“has”→ Task, or Task –“refers\_to”→ Change (depending on how Infraon models it). It also tells us “Tasks” are part of ITSM’s ServiceDesk module.
* Vector step: We search the API DB for “tasks by change” and find if an API exists to filter tasks by a change ID (the snippet in the API doc shows endpoints like `/task/rel-task-list/{id}/` which might be “related task list by change ID”). In fact, the snippet  shows endpoints that look like “change-task-list/{id}” and “release-task-list/{id}” – likely exactly to get tasks of a change or release. The vector search would surface these.
* The agent sees in context that `GET /ux/sd/task/task/change-task-list/{id}/` gives tasks for a change ID. It forms the call, plugs in CR-1005’s ID, calls the API, gets a list of tasks and their statuses. It then replies to the user with those statuses.
  Here the graph ensured the agent knew the link between Change and Task; the vector DB provided the exact API. Combined, the system could answer something that spans modules with no confusion. Traditional RAG alone might have retrieved some documentation about tasks and changes separately and left the model to infer how to join them (which is hard for a small LLM). Our integrated pipeline explicitly joins them via the graph, then uses RAG for detail – a much more robust solution.

In summary, aligning the knowledge graph and vector DB means: **the knowledge graph handles high-level routing, relational reasoning, and query decomposition, while the vector DB handles low-level detail retrieval.** The agent orchestrator pipelines these in a sequence (or loop) that ensures the right information is fetched at the right time. This results in more accurate and context-rich responses than using either alone. Studies have shown GraphRAG yields answers that are both correct and explainable by anchoring context to graph nodes – our design achieves that by always referencing the graph-derived structure when generating answers or actions.

Finally, by pipelining in this way, we also achieve efficiency. The graph reduces the search space (we don’t search the entire docs for every query, just the relevant subset). And the vector DB ensures we don’t overload the prompt with entire documents, just snippets that matter. This synergy is what will allow a lightweight LLM to function as an effective agent across the extensive Infraon platform.

# Example Use Case & Workflow Illustration

To cement the concepts, let’s walk through an example scenario and see how the components interact in an agentic workflow:

**Use Case:** *“Onboard a new employee by creating a user account, assigning them an ‘Engineer’ role, and setting up monitoring for their workstation device.”*

**Step 1: Graph-based Query Analysis** – The user’s request involves multiple actions across modules (User Management and Monitoring, possibly Asset Management for the device). The orchestrator first queries the knowledge graph:

* It finds “User account” relates to the User Management module (Infraon Platform’s account management).
* “Role” indicates the Roles/Permissions sub-module under User Management.
* “Workstation device monitoring” touches the Asset module (the device) and the Network Monitoring module for setting up monitoring.
  The graph reveals the following relevant nodes and relationships:

  * *User* (entity) in *User Management* module.
  * *Role* (entity) also in User Management (likely an entity or attribute of User, or related via “User ASSIGNED\_TO Role”).
  * *Device* (Asset) in Asset Management, which can be linked to *MonitoringPolicy* in Monitoring (perhaps *Asset MONITORED\_BY MonitoringPolicy*).
    It also finds the sequence: to monitor a device, typically the device (asset) must exist, and then a monitoring rule or bot is deployed. So possibly: *Asset -> then Monitoring setup*.
    From this analysis, the orchestrator deduces the sub-tasks: **(A)** Create user, **(B)** Assign role, **(C)** Ensure device asset exists, **(D)** Apply monitoring to device.

**Step 2: Vector Retrieval for Each Sub-task** – The agent now formulates specific queries for the vector DBs:

* For creating a user (subtask A): it searches the API index with “create user”. Result: the *Add User API* (e.g., `POST /platform/users` or similar) with documentation on required fields. It also pulls a doc snippet from the user guide on adding users if available (for any tips like password policy).
* For assigning a role (B): search API index “assign role user”. Likely finds an endpoint like *“POST /platform/users/{id}/roles”*. The user guide might have a section on roles; a snippet could be retrieved (“Infraon allows assigning roles to users via the user edit page…” etc.).
* For adding a device asset (C): search API index “add asset” – finds *Create Asset API* under Asset Management. Also maybe a guide snippet on adding assets (maybe from IT & Fixed Asset guide). If the device already exists, the user didn’t specify creation, but our agent might assume we need to ensure it exists. (The agent can even ask the user if not sure, but let’s assume it proceeds to create or verify asset existence).
* For setting up monitoring (D): search API “add monitor” or “install bot on asset”. Perhaps finds something like *Install Monitoring Agent API* or links to the “Bots” module (Infraon Automation has Bots for discovery). Alternatively, find “enable monitoring asset” – maybe a doc snippet explaining how an asset is assigned a monitoring template. Possibly Infraon uses a concept of attaching a device to monitoring via configuration. If unclear, the agent will rely on the graph: it saw “Bots - Install agents to enable discovery and monitoring”, so it might search for “Bots API” or “Discovery API”.

Each of these yields concrete API endpoints and instructions.

**Step 3: Composing Prompt and Reasoning** – The orchestrator now has:

* Graph context: modules and sequence (User Management → Asset → Monitoring, etc.).
* API details: endpoints for create user, assign role, create asset, deploy bot.
* Doc hints: any prerequisites (e.g., maybe need to know organization ID for creating user – the docs or graph might remind that new users need to be in an organization).
  It then prompts the LLM with something like:

“User asks to onboard new employee with user account, role ‘Engineer’, and monitor their device.
Knowledge:

* New User onboarding involves User Management (create user, assign role).
* Devices are assets in Asset Management and can be monitored by installing a Bot (Monitoring agent).
  Tools:

1. CreateUser API – `POST /api/v1/users` (requires name, email, etc.)
2. AssignRole API – `POST /api/v1/users/{id}/roles` (requires role ID)
3. CreateAsset API – `POST /api/v1/assets` (device details)
4. InstallBot API – `POST /api/v1/bots/install` (requires asset ID)

Plan the steps to fulfill the request, then execute them one by one.”

The LLM then goes into a ReAct loop (since we prompted it to plan steps):

**Thought 1:** “The user account must be created first so we have a user ID to assign a role. I will call CreateUser API.”
**Action 1:** `CALL CreateUserAPI(name="...", email="...")` – (The actual parameters would be filled from context or perhaps the assistant asks user for missing info like email; human-in-loop might provide it). The orchestrator executes this API call to Infraon, gets a response (new user ID).

**Observation 1:** (Orchestrator gives back result) e.g., “User created with ID = 45.”

**Thought 2:** “Now assign the ‘Engineer’ role to this user. I should find the role ID for ‘Engineer’. Possibly need to list roles or if I have it. I’ll try AssignRole API with role name.”
*(If the system had the role ID cached via graph or config, it would use it. Otherwise, the agent might call a ListRoles API first.)*
**Action 2:** `CALL ListRolesAPI()` – gets list of roles, finds “Engineer” with ID 7.
**Observation 2:** “Role ‘Engineer’ id=7.”
**Action 3:** `CALL AssignRoleAPI(user_id=45, role_id=7)` – executes, success.

**Thought 3:** “Next, ensure the device is in the system. Do we have device details? If not, maybe the user will provide or we assume a placeholder. I’ll create an asset named after the employee’s workstation.”
**Action 4:** `CALL CreateAssetAPI(name="John Doe Workstation", type="Computer", ... )` – success, gets asset ID 88.

**Thought 4:** “Finally, install monitoring on this asset. Use InstallBot or relevant Monitoring API.”
**Action 5:** `CALL InstallBotAPI(asset_id=88, agent_type="NMS")` – assume this triggers deploying a monitoring agent.
**Observation 5:** returns success or scheduled status.

**Thought 5:** “All steps done. I should confirm outcome to user.”
**Final Answer:** The agent might compile a summary: “User account created (ID 45) and granted ‘Engineer’ role. Asset ‘John Doe Workstation’ added (ID 88) and monitoring agent deployed. The new employee is onboarded and their device is under monitoring.”

Throughout this, the **knowledge graph** ensured the agent knew the order (user before role, asset before monitoring) and the relations (which module’s APIs to call). The **vector DB** provided the actual API call formats and any needed parameters. The agent’s reasoning (CoT + ReAct) broke it into 5 manageable API calls rather than one giant leap. A human operator could oversee these steps (especially the ones that might need input like names).

This example demonstrates how **graph and vector DB align for retrieval and routing** – the graph orchestrated the multi-module route and the vector provided content to execute at each juncture. The pipeline was able to seamlessly handle an **end-to-end workflow** that touches multiple Infraon modules.

## Conclusion

In this report, we presented a detailed strategy for building the MAN-O-MAN platform on Infraon Infinity, leveraging advanced AI techniques to achieve robust automation from day one. We determined that using **two vector databases** (for API metadata and documentation) and a **unified knowledge graph** (for domain relationships) strikes the right balance in organizing Infraon’s extensive knowledge. Each knowledge store’s content scope and format were specified – from hierarchical graph ontologies with modules, entities, and dependencies, to richly annotated text embeddings for retrieval. We outlined how to bootstrap these resources using powerful LLMs like **Gemini 2.5 Pro**, thereby infusing the system with a deep understanding of Infraon’s API schema and user guides without exhaustive manual effort.

Crucially, we designed prompt templates that dynamically inject relevant context, ensuring the lightweight LLM is never working in the dark. By incorporating **ReAct, Chain-of-Thought, and other prompting strategies**, the agent can reason through complex tasks in steps, consult tools, and reduce errors – effectively punching above its weight in capability. Finally, we illustrated how the **knowledge graph and vector DB pipeline** will operate: the graph provides a map and compass for the query (what modules and steps are involved), and the vector DB provides the detailed directions at each step. This integrated GraphRAG approach yields a more accurate, explainable, and efficient system, as evidenced by our example workflow and supported by emerging best practices in the industry.

By accounting for Infraon’s specific modules, APIs, and use cases in this design, the proposed solution is tailored to Infraon’s environment. It ensures that from day one, the agent is aware of **all Infraon modules and their interplay**, enabling it to handle requests spanning the entire platform. With human oversight in the loop, the system can continuously learn and refine (for example, updating the knowledge graph with new relations discovered during usage, or adjusting prompts as needed). Over time, this could evolve into an even more autonomous orchestration framework. But even in the initial implementation, MAN-O-MAN promises to greatly streamline Infraon operations by turning natural language requests into precise, multi-step actions – safely and intelligently.
