import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import mockGraphData from '../data/mockGraphData';

const Neo4jGraph = ({ data, onNodeSelect, viewType = 'graph' }) => {
  const svgRef = useRef(null);
  const simulationRef = useRef(null);
  const zoomRef = useRef(null);
  
  const [visibleGraph, setVisibleGraph] = useState({
    nodes: [],
    relationships: []
  });

  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [selectedNodes, setSelectedNodes] = useState(new Set());
  const [isDarkMode, setIsDarkMode] = useState(document.body.classList.contains('dark'));

  // Initialize with root nodes
  useEffect(() => {
    const rootNodes = mockGraphData.getRootNodes();
    setVisibleGraph({
      nodes: rootNodes,
      relationships: []
    });
  }, []);

  // Update when external data changes
  useEffect(() => {
    if (data && data.nodes && data.nodes.length > 0) {
      const transformedNodes = data.nodes.map(node => ({
        id: node.id,
        label: node.name,
        group: node.category,
        description: node.description,
        properties: node.properties
      }));

      const transformedRelationships = data.relationships?.map(rel => ({
        id: rel.id,
        source: rel.source,
        target: rel.target,
        type: rel.type,
        properties: rel.properties || {}
      })) || [];

      setVisibleGraph({
        nodes: transformedNodes,
        relationships: transformedRelationships
      });
    }
  }, [data]);

  // Handle node expansion
  const handleNodeExpansion = (nodeId) => {
    const newExpandedNodes = new Set(expandedNodes);
    if (newExpandedNodes.has(nodeId)) return;
    
    newExpandedNodes.add(nodeId);
    setExpandedNodes(newExpandedNodes);

    const children = mockGraphData.getChildNodes(nodeId);
    const childRelationships = mockGraphData.getRelationshipsForNode(nodeId);
    
    if (children.length > 0) {
      setVisibleGraph(prev => {
        const existingNodeIds = new Set(prev.nodes.map(n => n.id));
        const newNodes = children.filter(child => !existingNodeIds.has(child.id));
        
        const existingRelIds = new Set(prev.relationships.map(r => r.id));
        const newRelationships = childRelationships.filter(rel => !existingRelIds.has(rel.id));

        return {
          nodes: [...prev.nodes, ...newNodes],
          relationships: [...prev.relationships, ...newRelationships]
        };
      });
    }
  };

  // Zoom functions using D3 zoom
  const zoomIn = () => {
    if (zoomRef.current && svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg.transition().duration(300).call(
        zoomRef.current.scaleBy, 1.3
      );
    }
  };

  const zoomOut = () => {
    if (zoomRef.current && svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg.transition().duration(300).call(
        zoomRef.current.scaleBy, 1 / 1.3
      );
    }
  };

  const resetZoom = () => {
    if (zoomRef.current && svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg.transition().duration(500).call(
        zoomRef.current.transform,
        d3.zoomIdentity
      );
    }
  };

  const fitToScreen = () => {
    if (!zoomRef.current || !svgRef.current || visibleGraph.nodes.length === 0) return;
    
    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    const g = svg.select('g.main-group');
    
    try {
      const bounds = g.node().getBBox();
      if (bounds.width === 0 || bounds.height === 0) return;
      
      const widthScale = width / bounds.width;
      const heightScale = height / bounds.height;
      const scale = Math.min(widthScale, heightScale) * 0.8;
      
      const translate = [
        (width - bounds.width * scale) / 2 - bounds.x * scale,
        (height - bounds.height * scale) / 2 - bounds.y * scale
      ];
      
      svg.transition().duration(750).call(
        zoomRef.current.transform,
        d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
      );
    } catch (error) {
      console.warn('Could not fit to screen:', error);
    }
  };

  // Handle custom events from toolbar buttons
  useEffect(() => {
    const handleFitToScreen = () => fitToScreen();
    const handleResetZoom = () => resetZoom();

    window.addEventListener('fitToScreen', handleFitToScreen);
    window.addEventListener('resetZoom', handleResetZoom);
    
    return () => {
      window.removeEventListener('fitToScreen', handleFitToScreen);
      window.removeEventListener('resetZoom', handleResetZoom);
    };
  }, [visibleGraph.nodes.length]);

  // Node colors - matching KnowledgeBase color scheme
  const getNodeColor = (group) => {
    const colors = {
      'module': '#6366f1',     // Indigo - Core system modules
      'feature': '#10b981',    // Emerald - Feature functionality  
      'entity': '#f59e0b',     // Amber - Data entities
      'workflow': '#ef4444',   // Red - Process workflows
      'user': '#8b5cf6',       // Purple - User-related
      'document': '#06b6d4',   // Cyan - Documentation
      'system': '#84cc16',     // Lime - System components
      'process': '#ec4899',    // Pink - Business processes
      'data': '#3b82f6',       // Blue - Data objects
      'api': '#f97316'         // Orange - API endpoints
    };
    return colors[group.toLowerCase()] || '#6b7280';
  };

  // Main render
  useEffect(() => {
    if (!svgRef.current || visibleGraph.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Clear previous content
    svg.selectAll('*').remove();

    // Create main group for zoom/pan transforms
    const g = svg.append('g')
      .attr('class', 'main-group');

    // Setup D3 zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    // Store zoom reference for external controls
    zoomRef.current = zoom;

    // Apply zoom behavior to SVG
    svg.call(zoom);

    // Better wheel event handling to prevent conflicts
    svg.on('wheel', function(event) {
      // Check if the event target or any parent has panel-related classes
      const targetElement = event.target;
      const isInPanel = targetElement.closest('.kb-floating-panel') || 
                       targetElement.closest('.kb-panel-content') ||
                       targetElement.closest('.kb-toolbar');
      
      if (isInPanel) {
        event.stopPropagation();
        return;
      }
      
      // Allow normal zoom behavior for graph area - let D3 handle it
      event.preventDefault();
    });

    // Add arrowhead marker
    const arrowColor = isDarkMode ? '#475569' : '#cbd5e1';
    svg.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', arrowColor)
      .attr('stroke', arrowColor);

    // Force simulation with tighter node spacing
    const simulation = d3.forceSimulation(visibleGraph.nodes)
      .force('link', d3.forceLink(visibleGraph.relationships).id(d => d.id).distance(50))
      .force('charge', d3.forceManyBody().strength(-150))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30))

    simulationRef.current = simulation;

    // Create links
    const linkColor = isDarkMode ? '#475569' : '#cbd5e1';
    const links = g.append('g')
      .attr('class', 'links')
      .selectAll('path')
      .data(visibleGraph.relationships)
      .enter()
      .append('path')
      .attr('stroke', linkColor)
      .attr('stroke-opacity', 0.8)
      .attr('stroke-width', 2)
      .attr('fill', 'none')
      .attr('marker-end', 'url(#arrowhead)');

    // Create link labels
    const labelColor = isDarkMode ? '#94a3b8' : '#6b7280';
    const linkLabels = g.append('g')
      .attr('class', 'link-labels')
      .selectAll('text')
      .data(visibleGraph.relationships)
      .enter()
      .append('text')
      .attr('class', 'link-label')
      .attr('text-anchor', 'middle')
      .attr('dy', '-8px')
      .attr('font-size', '11px')
      .attr('font-weight', '500')
      .attr('fill', labelColor)
      .attr('pointer-events', 'none')
      .text(d => d.type);

    // Create node groups
    const nodeGroups = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(visibleGraph.nodes)
      .enter()
      .append('g')
      .attr('class', 'node-group')
      .attr('data-id', d => d.id)
      .style('cursor', 'pointer');

    // Add circles
    const nodeStroke = isDarkMode ? '#1e293b' : '#ffffff';
    const nodeShadow = isDarkMode ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' : 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))';
    
    const circles = nodeGroups.append('circle')
      .attr('r', 20)
      .attr('fill', d => getNodeColor(d.group))
      .attr('stroke', d => selectedNodes.has(d.id) ? '#22c55e' : nodeStroke)
      .attr('stroke-width', d => selectedNodes.has(d.id) ? 4 : 3)
      .style('filter', nodeShadow);

    // Add labels
    const textColor = isDarkMode ? '#f8fafc' : '#1f2937';
    const textShadow = isDarkMode ? '1px 1px 2px rgba(0,0,0,0.8)' : '1px 1px 2px rgba(255,255,255,0.8)';
    const labels = nodeGroups.append('text')
      .attr('class', 'node-label')
      .attr('text-anchor', 'middle')
      .attr('dy', '35px')
      .attr('font-size', '13px')
      .attr('font-weight', '700')
      .attr('font-family', 'Inter, -apple-system, BlinkMacSystemFont, sans-serif')
      .attr('fill', d => selectedNodes.has(d.id) ? '#22c55e' : textColor)
      .attr('pointer-events', 'none')
      .style('text-shadow', textShadow)
      .style('letter-spacing', '0.025em')
      .text(d => {
        const maxLength = 18;
        return d.label.length > maxLength ? 
          d.label.substring(0, maxLength) + '...' : 
          d.label;
      });

    // Add type labels
    const typeLabels = nodeGroups.append('text')
      .attr('class', 'node-type-label')
      .attr('text-anchor', 'middle')
      .attr('dy', '50px')
      .attr('font-size', '10px')
      .attr('font-weight', '500')
      .attr('font-family', 'Inter, -apple-system, BlinkMacSystemFont, sans-serif')
      .attr('fill', isDarkMode ? '#94a3b8' : '#6b7280')
      .attr('pointer-events', 'none')
      .style('text-transform', 'uppercase')
      .style('letter-spacing', '0.05em')
      .text(d => d.group);

    // Add expand indicators
    const indicators = nodeGroups.append('circle')
      .attr('class', 'expand-indicator')
      .attr('r', 6)
      .attr('cx', 15)
      .attr('cy', -15)
      .attr('fill', '#22c55e')
      .attr('stroke', nodeStroke)
      .attr('stroke-width', 2)
      .style('opacity', d => {
        const hasChildren = mockGraphData.getChildNodes(d.id).length > 0;
        const isExpanded = expandedNodes.has(d.id);
        return hasChildren && !isExpanded ? 1 : 0;
      });

    // Add plus signs
    nodeGroups.append('text')
      .attr('class', 'expand-text')
      .attr('x', 15)
      .attr('y', -11)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('fill', nodeStroke)
      .attr('pointer-events', 'none')
      .style('opacity', d => {
        const hasChildren = mockGraphData.getChildNodes(d.id).length > 0;
        const isExpanded = expandedNodes.has(d.id);
        return hasChildren && !isExpanded ? 1 : 0;
      })
      .text('+');

    // Node drag behavior that works with zoom
    const nodeDrag = d3.drag()
      .on('start', function(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', function(event, d) {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', function(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    // Click handlers
    let clickTimeout;
    nodeGroups
      .call(nodeDrag)
      .on('click', function(event, d) {
        event.preventDefault();
        event.stopPropagation();
        
        if (clickTimeout) clearTimeout(clickTimeout);
        
        clickTimeout = setTimeout(() => {
          const newSelectedNodes = new Set(selectedNodes);
          if (newSelectedNodes.has(d.id)) {
            newSelectedNodes.delete(d.id);
          } else {
            newSelectedNodes.add(d.id);
          }
          setSelectedNodes(newSelectedNodes);
          
          if (onNodeSelect) {
            onNodeSelect(d);
          }
        }, 200);
      })
      .on('dblclick', function(event, d) {
        event.preventDefault();
        event.stopPropagation();
        
        if (clickTimeout) clearTimeout(clickTimeout);
        handleNodeExpansion(d.id);
      });

    // Background click to deselect
    svg.on('click', function(event) {
      if (event.target === this) {
        setSelectedNodes(new Set());
      }
    });

    // Simulation tick
    simulation.on('tick', () => {
      links.attr('d', d => `M${d.source.x},${d.source.y}L${d.target.x},${d.target.y}`);
      linkLabels
        .attr('x', d => (d.source.x + d.target.x) / 2)
        .attr('y', d => (d.source.y + d.target.y) / 2);
      nodeGroups.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Cleanup
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, [visibleGraph, selectedNodes, expandedNodes, isDarkMode, onNodeSelect]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <svg
        ref={svgRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          background: 'transparent'
        }}
      />
      

      

      
      {visibleGraph.nodes.length === 0 && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'var(--text-color-light)',
          fontSize: '1.1rem',
          textAlign: 'center'
        }}>
          <div style={{ marginBottom: '1rem', fontSize: '2rem' }}>🔍</div>
          <div>Loading knowledge graph...</div>
        </div>
      )}
    </div>
  );
};

export default Neo4jGraph; 