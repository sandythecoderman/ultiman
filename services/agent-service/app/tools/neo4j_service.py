from neo4j import GraphDatabase
import logging

logger = logging.getLogger(__name__)

class Neo4jService:
    def __init__(self, uri="bolt://192.168.0.149:7687", username="neo4j", password="neo4j"):
        self.uri = uri
        self.username = username
        self.password = password
        self.driver = None
    
    def connect(self):
        """Connect to Neo4j database"""
        try:
            logger.info(f"Connecting to Neo4j at {self.uri}")
            self.driver = GraphDatabase.driver(self.uri, auth=(self.username, self.password))
            
            # Test connection
            with self.driver.session() as session:
                result = session.run("RETURN 1 as test")
                test_value = result.single()["test"]
                if test_value == 1:
                    logger.info("✅ Neo4j connection successful")
                    return True
            
        except Exception as e:
            logger.error(f"❌ Neo4j connection failed: {e}")
            
            # Try alternative password
            try:
                logger.info("Trying alternative password...")
                self.driver = GraphDatabase.driver(self.uri, auth=(self.username, "password"))
                with self.driver.session() as session:
                    result = session.run("RETURN 1 as test")
                    test_value = result.single()["test"]
                    if test_value == 1:
                        logger.info("✅ Neo4j connection successful with alternative password")
                        return True
            except Exception as alt_e:
                logger.error(f"❌ Alternative password failed: {alt_e}")
                raise e
    
    def close(self):
        """Close Neo4j connection"""
        if self.driver:
            self.driver.close()
            logger.info("Neo4j connection closed")
    
    def get_database_stats(self):
        """Get database statistics"""
        with self.driver.session() as session:
            # Get node count
            node_result = session.run("MATCH (n) RETURN count(n) as nodeCount")
            node_count = node_result.single()["nodeCount"]
            
            # Get relationship count
            rel_result = session.run("MATCH ()-[r]->() RETURN count(r) as relCount")
            rel_count = rel_result.single()["relCount"]
            
            # Get label count
            label_result = session.run("CALL db.labels() YIELD label RETURN count(label) as labelCount")
            label_count = label_result.single()["labelCount"]
            
            # Get relationship type count
            rel_type_result = session.run("CALL db.relationshipTypes() YIELD relationshipType RETURN count(relationshipType) as relTypeCount")
            rel_type_count = rel_type_result.single()["relTypeCount"]
            
            return {
                "nodeCount": node_count,
                "relationshipCount": rel_count,
                "labelCount": label_count,
                "relationshipTypeCount": rel_type_count
            }
    
    def get_node_labels(self):
        """Get all node labels"""
        with self.driver.session() as session:
            result = session.run("CALL db.labels() YIELD label RETURN label")
            return [record["label"] for record in result]
    
    def get_relationship_types(self):
        """Get all relationship types"""
        with self.driver.session() as session:
            result = session.run("CALL db.relationshipTypes() YIELD relationshipType RETURN relationshipType")
            return [record["relationshipType"] for record in result]
    
    def get_nodes(self, limit=100):
        """Get nodes with their properties and labels"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (n)
                RETURN id(n) as id, labels(n) as labels, properties(n) as properties
                LIMIT $limit
            """, limit=limit)
            
            nodes = []
            for record in result:
                node_id = str(record["id"])
                labels = record["labels"]
                properties = record["properties"]
                
                # Extract name from properties
                name = properties.get("name") or properties.get("title") or labels[0] if labels else f"Node {node_id}"
                
                # Map label to category
                category = self._map_label_to_category(labels[0] if labels else None)
                
                nodes.append({
                    "id": node_id,
                    "name": name,
                    "labels": labels,
                    "properties": properties,
                    "category": category,
                    "description": properties.get("description") or properties.get("summary") or f"{labels[0] if labels else 'Node'} with ID {node_id}"
                })
            
            return nodes
    
    def get_relationships(self, limit=200):
        """Get relationships between nodes"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (a)-[r]->(b)
                RETURN id(r) as id, id(a) as sourceId, id(b) as targetId, 
                       type(r) as type, properties(r) as properties
                LIMIT $limit
            """, limit=limit)
            
            relationships = []
            for record in result:
                relationships.append({
                    "id": str(record["id"]),
                    "source": str(record["sourceId"]),
                    "target": str(record["targetId"]),
                    "type": record["type"],
                    "properties": record["properties"]
                })
            
            return relationships
    
    def get_complete_graph_data(self):
        """Get complete graph data including nodes, relationships, labels, types, and stats"""
        try:
            stats = self.get_database_stats()
            labels = self.get_node_labels()
            relationship_types = self.get_relationship_types()
            nodes = self.get_nodes()
            relationships = self.get_relationships()
            
            return {
                "nodes": nodes,
                "relationships": relationships,
                "labels": labels,
                "relationshipTypes": relationship_types,
                "stats": stats
            }
        except Exception as e:
            logger.error(f"Error fetching complete graph data: {e}")
            raise e
    
    def _map_label_to_category(self, label):
        """Map Neo4j labels to frontend categories"""
        if not label:
            return 'architecture'
        
        label_lower = label.lower()
        
        if 'api' in label_lower or 'endpoint' in label_lower:
            return 'apis'
        elif 'business' in label_lower or 'process' in label_lower:
            return 'services'
        elif 'data' in label_lower or 'model' in label_lower or 'entity' in label_lower:
            return 'data'
        elif 'doc' in label_lower or 'keyword' in label_lower:
            return 'docs'
        elif 'param' in label_lower or 'path' in label_lower or 'root' in label_lower:
            return 'architecture'
        else:
            return 'architecture'  # default

# Create singleton instance
neo4j_service = Neo4jService() 