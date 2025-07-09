"""
The Master Verification Suite for the Ultiman Knowledge Base.

This script performs a comprehensive set of tests against the Neo4j and FAISS
databases to ensure they are both structurally sound and logically correct
according to the master plan.

It is divided into three main parts:
1.  Neo4jVerifier: Checks the health and logical integrity of the graph database.
2.  FaissVerifier: Checks the health and search relevance of the vector databases.
3.  Main execution block that runs all tests and prints a final report.
"""
import os
import json
import faiss
import numpy as np
from neo4j import GraphDatabase, exceptions
from sentence_transformers import SentenceTransformer

# --- Configuration ---
NEO4J_URI = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.environ.get("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.environ.get("NEO4J_PASSWORD", "password")
DATA_DIR = "data"
MODEL_NAME = "BAAI/bge-large-en-v1.5"

# --- Expected Schema Definitions (from Plan) ---
EXPECTED_NODE_LABELS = {"Module", "SubModule", "Entity", "Keyword", "API"}
EXPECTED_REL_TYPES = {"HAS_SUBMODULE", "CONTAINS_ENTITY", "ALIAS_OF", "TRIGGERS", "HAS_TASK"}


class Neo4jVerifier:
    """Tests the Neo4j database's health and logical integrity."""

    def __init__(self, driver):
        self.driver = driver
        self.results = {}

    def run_all_tests(self):
        print("\n--- Running Neo4j Verification Tests ---")
        # Health Checks
        self._run_test("Health: Connectivity", self.check_connectivity)
        self._run_test("Health: Schema - All Node Labels Present", self.check_node_labels)
        self._run_test("Health: Schema - All Relationship Types Present", self.check_rel_types)
        # Logical Checks
        self._run_test("Logic: Top-Level Modules Correct", self.check_top_level_modules)
        self._run_test("Logic: ITSM Sub-Modules Correct", self.check_itsm_submodules)
        self._run_test("Logic: Critical Relationship 'TRIGGERS' Exists", self.check_triggers_rel)
        self._run_test("Logic: Keyword Alias for 'ticket' Exists", self.check_ticket_alias)

    def _run_test(self, name, test_func):
        try:
            passed, message = test_func()
            self.results[name] = ("✅ PASSED" if passed else "❌ FAILED", message)
        except Exception as e:
            self.results[name] = ("❌ FAILED", f"Test threw an exception: {e}")

    def check_connectivity(self):
        self.driver.verify_connectivity()
        return True, "Successfully connected to Neo4j."

    def check_node_labels(self):
        with self.driver.session() as session:
            labels_in_db = set(row["label"] for row in session.run("CALL db.labels()"))
        missing = EXPECTED_NODE_LABELS - labels_in_db
        if not missing:
            return True, f"All {len(EXPECTED_NODE_LABELS)} expected node labels are present."
        else:
            return False, f"Missing node labels: {missing}"

    def check_rel_types(self):
        with self.driver.session() as session:
            types_in_db = set(row["relationshipType"] for row in session.run("CALL db.relationshipTypes()"))
        missing = EXPECTED_REL_TYPES - types_in_db
        if not missing:
            return True, f"All {len(EXPECTED_REL_TYPES)} expected relationship types are present."
        else:
            return False, f"Missing relationship types: {missing}"
    
    def check_top_level_modules(self):
        q = "MATCH (m:Module) RETURN collect(m.name) AS modules"
        with self.driver.session() as session:
            result = session.run(q).single()
        modules_in_db = set(result['modules'] if result else [])
        expected = {"ITSM", "ITOM", "Asset Management", "Network Monitoring", "Configuration", "NCCM"}
        if modules_in_db == expected:
            return True, "Correct top-level modules found."
        else:
            return False, f"Mismatched top-level modules. Missing: {expected - modules_in_db}, Unexpected: {modules_in_db - expected}"

    def check_itsm_submodules(self):
        q = "MATCH (:Module {name:'ITSM'})-[:HAS_SUBMODULE]->(s:SubModule) RETURN collect(s.name) as subs"
        with self.driver.session() as session:
            result = session.run(q).single()
        subs_in_db = set(result['subs'] if result else [])
        expected = {"Incident Management", "Problem Management", "Change Management", "Request Management", "Service Catalog"}
        if subs_in_db == expected:
            return True, "ITSM has all correct sub-modules."
        else:
            return False, f"Missing ITSM sub-modules: {expected - subs_in_db}"
            
    def check_triggers_rel(self):
        q = "RETURN EXISTS( (:Entity {name:'MonitoringAlert'})-[:TRIGGERS]->(:Entity {name:'Incident'}) ) AS rel_exists"
        with self.driver.session() as session:
            result = session.run(q).single()['rel_exists']
        if result:
            return True, "Critical relationship 'MonitoringAlert TRIGGERS Incident' exists."
        else:
            return False, "Missing critical relationship: MonitoringAlert -> Incident"
            
    def check_ticket_alias(self):
        q = "RETURN EXISTS( (:Keyword {name:'ticket'})-[:ALIAS_OF]->(:Entity {name:'Incident'}) ) AS alias_exists"
        with self.driver.session() as session:
            result = session.run(q).single()['alias_exists']
        if result:
            return True, "Keyword alias 'ticket' -> 'Incident' exists."
        else:
            return False, "Missing keyword alias for 'ticket'."


class FaissVerifier:
    """Tests the FAISS vector databases' health and search relevance."""

    def __init__(self, model):
        self.model = model
        self.results = {}
        self.api_index, self.api_content = self._load_db("api")
        self.docs_index, self.docs_content = self._load_db("docs")

    def _load_db(self, name):
        index_path = os.path.join(DATA_DIR, f"{name}_index.faiss")
        content_path = os.path.join(DATA_DIR, f"{name}_content.json")
        if not os.path.exists(index_path) or not os.path.exists(content_path):
            return None, None
        index = faiss.read_index(index_path)
        with open(content_path, 'r') as f:
            content = json.load(f)
        return index, content

    def run_all_tests(self):
        print("\n--- Running FAISS Verification Tests ---")
        # API DB Tests
        self._run_test("API DB: Health Checks", self.check_api_db_health)
        self._run_test("API DB: Search Relevance", self.check_api_search)
        # Docs DB Tests
        self._run_test("Docs DB: Health Checks", self.check_docs_db_health)
        self._run_test("Docs DB: Search Relevance", self.check_docs_search)

    def _run_test(self, name, test_func):
        try:
            passed, message = test_func()
            self.results[name] = ("✅ PASSED" if passed else "❌ FAILED", message)
        except Exception as e:
            self.results[name] = ("❌ FAILED", f"Test threw an exception: {e}")

    def check_api_db_health(self):
        return self._check_db_health("API", self.api_index, self.api_content)

    def check_docs_db_health(self):
        return self._check_db_health("Docs", self.docs_index, self.docs_content)

    def _check_db_health(self, name, index, content):
        if index is None or content is None:
            return False, f"{name} DB files are missing."
        model_dim = self.model.get_sentence_embedding_dimension()
        if index.d != model_dim:
            return False, f"Index dimension ({index.d}) does not match model dimension ({model_dim})."
        if index.ntotal != len(content):
            return False, f"Index size ({index.ntotal}) does not match content map size ({len(content)})."
        return True, "FAISS DB is structurally sound."
        
    def _search(self, query, index, content):
        query_embedding = self.model.encode([query], convert_to_numpy=True)
        _, indices = index.search(query_embedding.astype('float32'), 1)
        return content[indices[0][0]].get("text", "").lower()

    def check_api_search(self):
        top_result = self._search("delete a task", self.api_index, self.api_content)
        if "delete" in top_result and "task" in top_result:
            return True, "API search for 'delete a task' is relevant."
        else:
            return False, f"API search for 'delete a task' was irrelevant. Got: '{top_result}'"
            
    def check_docs_search(self):
        top_result = self._search("incident escalation", self.docs_index, self.docs_content)
        if ("escalation" in top_result and 
            ("incident" in top_result or "ticket" in top_result)):
            return True, "Docs search for 'incident escalation' is relevant."
        else:
            return False, f"Docs search for 'incident escalation' was irrelevant. Got: '{top_result}'"


def print_report(title, results):
    """Prints a formatted report from a results dictionary."""
    print(f"\n--- {title} ---")
    if not results:
        print("No tests were run.")
        return
        
    passed_count = sum(1 for status, _ in results.values() if "PASSED" in status)
    total_count = len(results)
    
    print(f"Summary: {passed_count} Passed, {total_count - passed_count} Failed")
    for name, (status, msg) in results.items():
        print(f"{status:15} | {name}")
        if "FAILED" in status:
            print(f"{'':18}└─ {msg}")

def main():
    """Main execution block."""
    print("--- Initializing Master Verification Suite ---")
    
    # Initialize Neo4j
    neo4j_driver = None
    try:
        neo4j_driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
        neo4j_verifier = Neo4jVerifier(neo4j_driver)
        neo4j_verifier.run_all_tests()
    except Exception as e:
        print(f"\nFATAL: Could not initialize Neo4j Verifier. Error: {e}")
    
    # Initialize FAISS
    faiss_verifier = None
    try:
        model = SentenceTransformer(MODEL_NAME, trust_remote_code=True)
        faiss_verifier = FaissVerifier(model)
        faiss_verifier.run_all_tests()
    except Exception as e:
        print(f"\nFATAL: Could not initialize FAISS Verifier. Error: {e}")

    # Final Report
    if neo4j_verifier:
        print_report("Neo4j Verification Report", neo4j_verifier.results)
    if faiss_verifier:
        print_report("FAISS Verification Report", faiss_verifier.results)
        
    if neo4j_driver:
        neo4j_driver.close()

if __name__ == "__main__":
    main() 