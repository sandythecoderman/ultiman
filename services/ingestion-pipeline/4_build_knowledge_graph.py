"""
Builds the final knowledge graph ontology from various structured data sources.

This script is the core of the knowledge graph creation. It takes the enriched
document data and the raw API specification and synthesizes them into a
cohesive, interconnected graph structure according to the master plan.

The output is a single JSON file (knowledge_graph_ontology.json) that contains
all the nodes and edges to be loaded into Neo4j.
"""

import os
import json
from typing import Dict, List, Any

# --- Constants ---
DATA_DIR = "data"
ENRICHED_DOCS_FILE = os.path.join(DATA_DIR, "enriched_user_guide.json")
OUTPUT_ONTOLOGY_FILE = os.path.join(DATA_DIR, "knowledge_graph_ontology.json")

# --- Ontology Definition (from Plan for Ultiman.md) ---
ONTOLOGY_HIERARCHY = {
    "ITSM": ["Incident Management", "Problem Management", "Change Management", "Request Management", "Service Catalog"],
    "ITOM": ["Event Management", "Log Management"],
    "Asset Management": ["CMDB", "Contract Management", "Software Asset Management"],
    "Network Monitoring": ["Performance", "Topology", "Network Planning"],
    "Configuration": ["SLA Management", "Knowledge Base", "Report"],
    "NCCM": ["Download Job", "IMACD"]
}

KEYWORD_ALIASES = {
    "ticket": "Incident",
    "issue": "Incident",
    "problem": "Problem",
    "change": "Change",
    "request": "Request"
}

CRITICAL_RELATIONSHIPS = [
    {"source": "MonitoringAlert", "target": "Incident", "type": "TRIGGERS"},
    {"source": "Change Request", "target": "Task", "type": "HAS_TASK"}
]

# --- Main Class ---
class KnowledgeGraphBuilder:
    def __init__(self):
        self.nodes: Dict[str, Dict[str, Any]] = {}
        self.edges: List[Dict[str, Any]] = []

    def _add_node(self, node_id: str, label: str, properties: Dict[str, Any] = None):
        if node_id not in self.nodes:
            self.nodes[node_id] = {"id": node_id, "label": label}
        if properties:
            self.nodes[node_id].update(properties)

    def _add_edge(self, source_id: str, target_id: str, rel_type: str):
        if source_id in self.nodes and target_id in self.nodes:
            self.edges.append({"source": source_id, "target": target_id, "relationship": rel_type})

    def build_base_ontology(self):
        print("Building base ontology: Modules and Sub-Modules...")
        for module, sub_modules in ONTOLOGY_HIERARCHY.items():
            self._add_node(module, "Module", {"name": module})
            for sub_module in sub_modules:
                self._add_node(sub_module, "SubModule", {"name": sub_module})
                self._add_edge(module, sub_module, "HAS_SUBMODULE")

    def process_docs_for_entities(self, docs_data: List[Dict[str, Any]]):
        print("Processing documents for Entities and linking to ontology...")
        for item in docs_data:
            enrichment = item.get("enrichment", {})
            mentioned_modules = enrichment.get("mentioned_modules", [])
            mentioned_features = enrichment.get("mentioned_features", [])
            
            for entity_name in mentioned_features:
                self._add_node(entity_name, "Entity", {"name": entity_name, "source_document": item.get("original_chunk", "")})
                for module_name in mentioned_modules:
                    self._add_edge(module_name, entity_name, "CONTAINS_ENTITY")

    def add_special_nodes_and_relations(self):
        print("Adding special entities, aliases, and critical relationships...")
        # Add special entities that might not be in docs
        self._add_node("Incident", "Entity", {"name": "Incident"})
        self._add_node("MonitoringAlert", "Entity", {"name": "MonitoringAlert"})
        self._add_node("Change Request", "Entity", {"name": "Change Request"})
        self._add_node("Task", "Entity", {"name": "Task"})
        
        # Add Aliases
        for alias, entity_name in KEYWORD_ALIASES.items():
            self._add_node(f"keyword_{alias}", "Keyword", {"name": alias})
            self._add_edge(f"keyword_{alias}", entity_name, "ALIAS_OF")
            
        # Add Critical Relationships
        for rel in CRITICAL_RELATIONSHIPS:
            self._add_edge(rel["source"], rel["target"], rel["type"])

    def process_apis(self, api_data: list):
        """Processes the API spec to create API nodes in the graph."""
        print("Processing API specifications to create API nodes...")
        for endpoint in api_data:
            method = endpoint.get("method", "N/A").upper()
            path = endpoint.get("path", "")
            summary = endpoint.get("summary", "No description available.")
            node_id = f"API:{method}:{path}"
            self._add_node(node_id, "API", {"name": f"{method} {path}", "summary": summary, "method": method, "path": path})

    def build(self):
        print("--- Starting Step 4: Build Knowledge Graph (Overhaul) ---")
        docs_data = self.load_json_data(ENRICHED_DOCS_FILE)
        api_data = self.load_json_data(os.path.join(DATA_DIR, "raw_api_spec.json"))
        
        self.build_base_ontology()
        self.process_docs_for_entities(docs_data)
        self.process_apis(api_data)
        self.add_special_nodes_and_relations()
        
        self.save_to_file()
        print("--- Step 4: Build Knowledge Graph Complete ---")

    def load_json_data(self, file_path: str):
        print(f"Loading data from: {file_path}")
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def save_to_file(self):
        output_data = {"nodes": list(self.nodes.values()), "edges": self.edges}
        print(f"Writing final ontology to {OUTPUT_ONTOLOGY_FILE}...")
        with open(OUTPUT_ONTOLOGY_FILE, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2)
        print(f"Graph built: {len(self.nodes)} nodes, {len(self.edges)} edges.")

def main():
    builder = KnowledgeGraphBuilder()
    builder.build()

if __name__ == "__main__":
    main() 