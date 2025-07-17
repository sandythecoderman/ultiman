import infraonOntology from '../infraon_ontology.json' with { type: 'json' };

// Transform the infraon ontology into a graph structure
const transformOntologyToGraph = () => {
  const nodes = [];
  const relationships = [];
  const nodeMap = new Map();

  // Helper function to create a unique node ID
  const createNodeId = (type, key) => `${type}:${key}`;

  // Helper function to add a node if it doesn't exist
  const addNode = (id, label, group, description = '', properties = {}) => {
    if (!nodeMap.has(id)) {
      const node = {
        id,
        label,
        group,
        description,
        properties,
        x: Math.random() * 800,
        y: Math.random() * 600
      };
      nodes.push(node);
      nodeMap.set(id, node);
    }
    return nodeMap.get(id);
  };

  // Helper function to add a relationship
  const addRelationship = (source, target, type) => {
    relationships.push({
      id: `${source}-${type}-${target}`,
      source,
      target,
      type
    });
  };

  // Process modules
  Object.entries(infraonOntology.modules || {}).forEach(([moduleKey, moduleData]) => {
    const moduleId = createNodeId('module', moduleKey);
    addNode(
      moduleId,
      moduleData.name || moduleKey,
      'module',
      moduleData.description || '',
      { category: moduleData.category, type: 'module' }
    );

    // Process features within modules
    Object.entries(moduleData.features || {}).forEach(([featureKey, featureData]) => {
      const featureId = createNodeId('feature', featureKey);
      addNode(
        featureId,
        featureData.name || featureKey,
        'feature',
        featureData.description || '',
        { category: featureData.category, type: 'feature', module: moduleKey }
      );

      // Link module to feature
      addRelationship(moduleId, featureId, 'HAS_FEATURE');

      // Process entities within features
      Object.entries(featureData.entities || {}).forEach(([entityKey, entityData]) => {
        const entityId = createNodeId('entity', entityKey);
        addNode(
          entityId,
          entityData.name || entityKey,
          'entity',
          entityData.description || '',
          { 
            type: entityData.type, 
            entityType: 'entity', 
            feature: featureKey, 
            module: moduleKey 
          }
        );

        // Link feature to entity
        addRelationship(featureId, entityId, 'HAS_ENTITY');
      });
    });

    // Process workflows within modules
    Object.entries(moduleData.workflows || {}).forEach(([workflowKey, workflowData]) => {
      const workflowId = createNodeId('workflow', workflowKey);
      addNode(
        workflowId,
        workflowData.name || workflowKey,
        'workflow',
        workflowData.description || '',
        { type: 'workflow', module: moduleKey }
      );

      // Link module to workflow
      addRelationship(moduleId, workflowId, 'HAS_WORKFLOW');
    });
  });

  return { nodes, relationships };
};

// Get root nodes (modules) for initial display
const getRootNodes = (allNodes) => {
  return allNodes.filter(node => node.group === 'module');
};

// Get children of a specific node
const getNodeChildren = (nodeId, allNodes, allRelationships) => {
  const childRelationships = allRelationships.filter(rel => rel.source === nodeId);
  const childNodeIds = childRelationships.map(rel => rel.target);
  const childNodes = allNodes.filter(node => childNodeIds.includes(node.id));
  
  return {
    nodes: childNodes,
    relationships: childRelationships
  };
};

// Get child nodes for a specific node (for expansion)
const getChildNodes = (nodeId, allNodes, allRelationships) => {
  const childRelationships = allRelationships.filter(rel => rel.source === nodeId);
  const childNodeIds = childRelationships.map(rel => rel.target);
  return allNodes.filter(node => childNodeIds.includes(node.id));
};

// Get relationships for a specific node (both incoming and outgoing)
const getRelationshipsForNode = (nodeId, allRelationships) => {
  return allRelationships.filter(rel => rel.source === nodeId || rel.target === nodeId);
};

// Transform and export the data
const { nodes: allNodes, relationships: allRelationships } = transformOntologyToGraph();

export const mockGraphData = {
  allNodes,
  allRelationships,
  getRootNodes: () => getRootNodes(allNodes),
  getNodeChildren: (nodeId) => getNodeChildren(nodeId, allNodes, allRelationships),
  getChildNodes: (nodeId) => getChildNodes(nodeId, allNodes, allRelationships),
  getRelationshipsForNode: (nodeId) => getRelationshipsForNode(nodeId, allRelationships)
};

export default mockGraphData; 