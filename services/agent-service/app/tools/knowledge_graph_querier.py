import logging
import os
from typing import Dict, Any, List, Optional
import asyncio
from neo4j import AsyncGraphDatabase
from ..models.agent_models import ToolExecutionContext

logger = logging.getLogger(__name__)

class KnowledgeGraphQuerier:
    """Tool for querying the Neo4j knowledge graph"""
    
    def __init__(self):
        self.uri = os.getenv('NEO4J_URI', 'bolt://localhost:7687')
        self.username = os.getenv('NEO4J_USERNAME', 'neo4j')
        self.password = os.getenv('NEO4J_PASSWORD', 'password')
        self.database = os.getenv('NEO4J_DATABASE', 'neo4j')
        
        # Initialize driver
        self.driver = None
        self._initialize_driver()
        
        # Predefined query templates for common operations
        self.query_templates = {
            'find_entity': "MATCH (n) WHERE n.name CONTAINS $search_term OR n.id CONTAINS $search_term RETURN n LIMIT 10",
            'find_relationships': "MATCH (a)-[r]->(b) WHERE a.name CONTAINS $search_term OR a.id CONTAINS $search_term RETURN a, r, b LIMIT 20",
            'get_connected_entities': "MATCH (n {name: $entity_name})-[r]-(connected) RETURN n, r, connected LIMIT 15",
            'find_by_type': "MATCH (n:$node_type) RETURN n LIMIT 20",
            'search_announcements': "MATCH (n:Announcement) WHERE n.title CONTAINS $search_term OR n.content CONTAINS $search_term RETURN n",
            'search_services': "MATCH (n:Service) WHERE n.name CONTAINS $search_term OR n.description CONTAINS $search_term RETURN n",
            'search_tickets': "MATCH (n:Ticket) WHERE n.title CONTAINS $search_term OR n.description CONTAINS $search_term RETURN n",
            'get_service_dependencies': "MATCH (s:Service {name: $service_name})-[:DEPENDS_ON*1..3]-(dep) RETURN s, dep",
            'get_user_tickets': "MATCH (u:User {name: $user_name})-[:CREATED|ASSIGNED_TO]-(t:Ticket) RETURN u, t",
        }
        
        logger.info(f"🔗 KnowledgeGraphQuerier initialized with URI: {self.uri}")
    
    def _initialize_driver(self):
        """Initialize Neo4j driver"""
        try:
            self.driver = AsyncGraphDatabase.driver(
                self.uri, 
                auth=(self.username, self.password)
            )
            logger.info("✅ Neo4j driver initialized successfully")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Neo4j driver: {str(e)}")
            raise
    
    async def execute(self, parameters: Dict[str, Any], context: ToolExecutionContext) -> Dict[str, Any]:
        """
        Execute a knowledge graph query
        
        Parameters:
        - query_type: Type of query to execute (e.g., 'find_entity', 'find_relationships')
        - search_term: Search term for entity queries
        - entity_name: Specific entity name for targeted queries
        - node_type: Node type for type-based queries
        - custom_query: Custom Cypher query (use with caution)
        - limit: Maximum number of results to return
        """
        
        query_type = parameters.get('query_type', 'find_entity')
        search_term = parameters.get('search_term', '')
        entity_name = parameters.get('entity_name', '')
        node_type = parameters.get('node_type', '')
        custom_query = parameters.get('custom_query', '')
        limit = parameters.get('limit', 10)
        
        logger.info(f"🔍 Executing knowledge graph query: {query_type}")
        
        try:
            # Determine which query to use
            if custom_query:
                query = custom_query
                query_params = parameters.get('query_params', {})
            elif query_type in self.query_templates:
                query = self.query_templates[query_type]
                
                # Prepare parameters based on query type
                query_params = {}
                if search_term:
                    query_params['search_term'] = search_term
                if entity_name:
                    query_params['entity_name'] = entity_name
                if node_type:
                    # For node type queries, we need to modify the query
                    query = query.replace('$node_type', node_type)
                
                # Add limit to query if not present
                if 'LIMIT' not in query:
                    query += f" LIMIT {limit}"
                    
            else:
                raise ValueError(f"Unknown query type: {query_type}. Available types: {list(self.query_templates.keys())}")
            
            # Execute the query
            results = await self._execute_query(query, query_params)
            
            logger.info(f"✅ Knowledge graph query successful. Found {len(results)} results")
            
            return {
                'success': True,
                'query_type': query_type,
                'results': results,
                'count': len(results),
                'message': f"Successfully executed {query_type} query"
            }
            
        except Exception as e:
            logger.error(f"❌ Knowledge graph query failed: {str(e)}")
            
            return {
                'success': False,
                'query_type': query_type,
                'error': str(e),
                'message': f"Failed to execute {query_type} query"
            }
    
    async def _execute_query(self, query: str, parameters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Execute a Cypher query and return results"""
        
        if not self.driver:
            raise Exception("Neo4j driver not initialized")
        
        async with self.driver.session(database=self.database) as session:
            result = await session.run(query, parameters)
            
            # Convert results to list of dictionaries
            records = []
            async for record in result:
                record_dict = {}
                for key in record.keys():
                    value = record[key]
                    
                    # Convert Neo4j nodes/relationships to dictionaries
                    if hasattr(value, 'labels') and hasattr(value, 'items'):
                        # This is a Node
                        record_dict[key] = {
                            'labels': list(value.labels),
                            'properties': dict(value.items())
                        }
                    elif hasattr(value, 'type') and hasattr(value, 'items'):
                        # This is a Relationship
                        record_dict[key] = {
                            'type': value.type,
                            'properties': dict(value.items())
                        }
                    else:
                        # Regular value
                        record_dict[key] = value
                
                records.append(record_dict)
            
            return records
    
    async def search_entities(self, search_term: str, limit: int = 10) -> Dict[str, Any]:
        """Convenience method to search for entities"""
        return await self.execute(
            parameters={
                'query_type': 'find_entity',
                'search_term': search_term,
                'limit': limit
            },
            context=ToolExecutionContext(session_id="direct", user_query=f"search_entities: {search_term}")
        )
    
    async def find_relationships(self, search_term: str, limit: int = 20) -> Dict[str, Any]:
        """Convenience method to find relationships"""
        return await self.execute(
            parameters={
                'query_type': 'find_relationships',
                'search_term': search_term,
                'limit': limit
            },
            context=ToolExecutionContext(session_id="direct", user_query=f"find_relationships: {search_term}")
        )
    
    async def get_connected_entities(self, entity_name: str, limit: int = 15) -> Dict[str, Any]:
        """Convenience method to get connected entities"""
        return await self.execute(
            parameters={
                'query_type': 'get_connected_entities',
                'entity_name': entity_name,
                'limit': limit
            },
            context=ToolExecutionContext(session_id="direct", user_query=f"get_connected_entities: {entity_name}")
        )
    
    async def search_by_type(self, node_type: str, limit: int = 20) -> Dict[str, Any]:
        """Convenience method to search by node type"""
        return await self.execute(
            parameters={
                'query_type': 'find_by_type',
                'node_type': node_type,
                'limit': limit
            },
            context=ToolExecutionContext(session_id="direct", user_query=f"search_by_type: {node_type}")
        )
    
    async def search_announcements(self, search_term: str) -> Dict[str, Any]:
        """Search for announcements in the knowledge graph"""
        return await self.execute(
            parameters={
                'query_type': 'search_announcements',
                'search_term': search_term
            },
            context=ToolExecutionContext(session_id="direct", user_query=f"search_announcements: {search_term}")
        )
    
    async def search_services(self, search_term: str) -> Dict[str, Any]:
        """Search for services in the knowledge graph"""
        return await self.execute(
            parameters={
                'query_type': 'search_services',
                'search_term': search_term
            },
            context=ToolExecutionContext(session_id="direct", user_query=f"search_services: {search_term}")
        )
    
    async def test_connection(self) -> Dict[str, Any]:
        """Test the connection to Neo4j"""
        try:
            if not self.driver:
                return {
                    'connection_status': 'failed',
                    'message': 'Neo4j driver not initialized',
                    'error': 'Driver initialization failed'
                }
            
            async with self.driver.session(database=self.database) as session:
                result = await session.run("RETURN 1 as test")
                record = await result.single()
                
                if record and record['test'] == 1:
                    return {
                        'connection_status': 'success',
                        'message': 'Successfully connected to Neo4j',
                        'database': self.database
                    }
                else:
                    return {
                        'connection_status': 'failed',
                        'message': 'Unexpected response from Neo4j'
                    }
                    
        except Exception as e:
            return {
                'connection_status': 'failed',
                'message': f'Failed to connect to Neo4j: {str(e)}',
                'error': str(e)
            }
    
    async def close(self):
        """Close the Neo4j driver"""
        if self.driver:
            await self.driver.close()
            logger.info("📝 Neo4j driver closed")
    
    def get_available_query_types(self) -> List[str]:
        """Get list of available query types"""
        return list(self.query_templates.keys()) 