import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import mockGraphData from '../data/mockGraphData';

const Neo4jGraph = ({ data, onNodeSelect, viewType = 'graph' }) => {
  const svgRef = useRef(null);
  const simulationRef = useRef(null);
  
  // State for currently visible nodes and relationships
  const [visibleGraph, setVisibleGraph] = useState({
    nodes: [],
    relationships: []
  });

  // Track expanded nodes
  const [expandedNodes, setExpandedNodes] = useState(new Set());

  // Initialize with root nodes on mount
  useEffect(() => {
    console.log('🌟 Initializing Neo4jGraph with root nodes');
    const rootNodes = mockGraphData.getRootNodes();
    setVisibleGraph({
      nodes: rootNodes,
      relationships: []
    });
  }, []);

  // Update visible graph when external data changes (from filters)
  useEffect(() => {
    if (data && data.nodes && data.nodes.length > 0) {
      console.log('📊 Updating graph with filtered data:', data.nodes.length, 'nodes');
      
      // Transform external data to internal format
      const transformedNodes = data.nodes.map(node => ({
        id: node.id,
        label: node.name,
        group: node.category,
        description: node.description,
        properties: node.properties,
        x: node.x,
        y: node.y,
        vx: node.vx,
        vy: node.vy
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

  // Node expansion handler
  const handleNodeExpansion = useCallback((nodeId) => {
    console.log('🔍 Expanding node:', nodeId);
    
    const newExpandedNodes = new Set(expandedNodes);
    if (newExpandedNodes.has(nodeId)) {
      console.log('📦 Node already expanded, collapsing');
      return;
    }
    
    newExpandedNodes.add(nodeId);
    setExpandedNodes(newExpandedNodes);

    // Get children for the clicked node
    const children = mockGraphData.getChildNodes(nodeId);
    const childRelationships = mockGraphData.getRelationshipsForNode(nodeId);
    
    console.log(`🌿 Found ${children.length} children and ${childRelationships.length} relationships`);

    if (children.length > 0) {
      setVisibleGraph(prev => {
        // Avoid duplicates
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
  }, [expandedNodes]);

  // Color scheme for different node types
  const getNodeColor = (group) => {
    const colors = {
      'Module': '#8b5cf6',
      'Feature': '#06b6d4', 
      'Entity': '#10b981',
      'Workflow': '#f59e0b'
    };
    return colors[group] || '#6b7280';
  };

  // Main D3 rendering effect
  useEffect(() => {
    if (!visibleGraph.nodes.length) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    console.log(`🎨 Rendering graph: ${visibleGraph.nodes.length} nodes, ${visibleGraph.relationships.length} relationships`);

    // Clear previous content
    svg.selectAll('*').remove();

    // Create main group for zoom/pan
    const g = svg.append('g').attr('class', 'main-group');

    // Add responsive background
    const defs = svg.append('defs');
    
    // Get current theme
    const isDarkMode = document.body.classList.contains('dark');
    
    // Gradient definition
    const gradient = defs.append('linearGradient')
      .attr('id', 'background-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '100%');

    if (isDarkMode) {
      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', '#0f172a');
      
      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', '#1e293b');
    } else {
      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', '#f8fafc');
      
      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', '#e2e8f0');
    }

    // Background rectangle
    svg.insert('rect', ':first-child')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('fill', 'url(#background-gradient)');

    // Arrow marker for relationships
    const arrowColor = isDarkMode ? '#64748b' : '#94a3b8';
    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 28)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .attr('xoverflow', 'visible')
      .append('svg:path')
      .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
      .attr('fill', arrowColor)
      .attr('stroke', arrowColor);

    // Create simulation
    const simulation = d3.forceSimulation(visibleGraph.nodes)
      .force('link', d3.forceLink(visibleGraph.relationships)
        .id(d => d.id)
        .distance(120)
        .strength(0.6))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(35));

    simulationRef.current = simulation;

    // Create links
    const linkColor = isDarkMode ? '#475569' : '#cbd5e1';
    const links = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(visibleGraph.relationships)
      .enter()
      .append('line')
      .attr('stroke', linkColor)
      .attr('stroke-opacity', 0.8)
      .attr('stroke-width', 2)
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
      .style('cursor', 'pointer');

    // Add solid circles for nodes
    const nodeStroke = isDarkMode ? '#1e293b' : '#ffffff';
    const nodeShadow = isDarkMode ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' : 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))';
    const circles = nodeGroups.append('circle')
      .attr('r', 20)
      .attr('fill', d => getNodeColor(d.group))
      .attr('stroke', nodeStroke)
      .attr('stroke-width', 3)
      .style('filter', nodeShadow)
      .style('transition', 'all 0.3s ease');

    // Add node labels
    const textColor = isDarkMode ? '#f8fafc' : '#1f2937';
    const textShadow = isDarkMode ? '1px 1px 2px rgba(0,0,0,0.8)' : '1px 1px 2px rgba(255,255,255,0.8)';
    const labels = nodeGroups.append('text')
      .attr('class', 'node-label')
      .attr('text-anchor', 'middle')
      .attr('dy', '35px')
      .attr('font-size', '12px')
      .attr('font-weight', '600')
      .attr('fill', textColor)
      .attr('pointer-events', 'none')
      .style('text-shadow', textShadow)
      .text(d => {
        const maxLength = 15;
        return d.label.length > maxLength ? 
          d.label.substring(0, maxLength) + '...' : 
          d.label;
      });

    // Add expandable indicator for nodes with children
    const indicatorStroke = isDarkMode ? '#1e293b' : '#ffffff';
    const indicators = nodeGroups.append('circle')
      .attr('class', 'expand-indicator')
      .attr('r', 6)
      .attr('cx', 15)
      .attr('cy', -15)
      .attr('fill', '#22c55e')
      .attr('stroke', indicatorStroke)
      .attr('stroke-width', 2)
      .style('opacity', d => {
        const hasChildren = mockGraphData.getChildNodes(d.id).length > 0;
        const isExpanded = expandedNodes.has(d.id);
        return hasChildren && !isExpanded ? 1 : 0;
      })
      .style('transition', 'opacity 0.3s ease');

    // Add plus sign to expand indicators
    const plusColor = isDarkMode ? '#1e293b' : '#ffffff';
    nodeGroups.append('text')
      .attr('class', 'expand-text')
      .attr('x', 15)
      .attr('y', -11)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('fill', plusColor)
      .attr('pointer-events', 'none')
      .style('opacity', d => {
        const hasChildren = mockGraphData.getChildNodes(d.id).length > 0;
        const isExpanded = expandedNodes.has(d.id);
        return hasChildren && !isExpanded ? 1 : 0;
      })
      .text('+');

    // Hover effects
    const hoverShadow = isDarkMode ? 'drop-shadow(0 6px 12px rgba(0,0,0,0.4)) brightness(1.1)' : 'drop-shadow(0 6px 12px rgba(0,0,0,0.2)) brightness(1.1)';
    nodeGroups
      .on('mouseenter', function(event, d) {
        d3.select(this).select('circle')
          .transition()
          .duration(200)
          .attr('r', 24)
          .style('filter', hoverShadow);
        
        d3.select(this).select('.node-label')
          .transition()
          .duration(200)
          .attr('font-size', '13px');
      })
      .on('mouseleave', function(event, d) {
        d3.select(this).select('circle')
          .transition()
          .duration(200)
          .attr('r', 20)
          .style('filter', nodeShadow);
        
        d3.select(this).select('.node-label')
          .transition()
          .duration(200)
          .attr('font-size', '12px');
      });

    // Click handlers
    let clickTimeout;
    nodeGroups.on('click', function(event, d) {
      event.stopPropagation();
      
      // Clear any existing timeout
      if (clickTimeout) clearTimeout(clickTimeout);
      
      // Single click - select node
      clickTimeout = setTimeout(() => {
        console.log('🎯 Single click - selecting node:', d.label);
        if (onNodeSelect) {
          onNodeSelect({
            id: d.id,
            name: d.label,
            category: d.group,
            description: d.description,
            properties: d.properties
          });
        }
      }, 250);
    });

    // Double click handler for expansion
    nodeGroups.on('dblclick', function(event, d) {
      event.stopPropagation();
      
      // Clear single click timeout
      if (clickTimeout) clearTimeout(clickTimeout);
      
      console.log('🚀 Double click - expanding node:', d.label);
      
      // Add visual feedback
      const expandShadow = isDarkMode ? 'drop-shadow(0 8px 16px rgba(0,0,0,0.5)) brightness(1.3)' : 'drop-shadow(0 8px 16px rgba(0,0,0,0.3)) brightness(1.3)';
      d3.select(this).select('circle')
        .transition()
        .duration(300)
        .attr('r', 28)
        .style('filter', expandShadow)
        .transition()
        .duration(300)
        .attr('r', 20)
        .style('filter', nodeShadow);
      
      handleNodeExpansion(d.id);
    });

    // Drag behavior
    const drag = d3.drag()
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

    nodeGroups.call(drag);

    // Zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.3, 3])
      .on('zoom', function(event) {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Update positions on tick
    simulation.on('tick', () => {
      links
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      linkLabels
        .attr('x', d => (d.source.x + d.target.x) / 2)
        .attr('y', d => (d.source.y + d.target.y) / 2);

      nodeGroups
        .attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Set initial zoom to fit content
    setTimeout(() => {
      const bounds = g.node().getBBox();
      const fullWidth = width;
      const fullHeight = height;
      const widthScale = fullWidth / bounds.width;
      const heightScale = fullHeight / bounds.height;
      const scale = Math.min(widthScale, heightScale) * 0.8;
      
      const translate = [
        (fullWidth - bounds.width * scale) / 2 - bounds.x * scale,
        (fullHeight - bounds.height * scale) / 2 - bounds.y * scale
      ];

      svg.transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
    }, 500);

    // Cleanup
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };

  }, [visibleGraph, expandedNodes, onNodeSelect, handleNodeExpansion]);

  // Handle view type changes
  if (viewType !== 'graph') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: 'var(--text-color-light)',
        fontSize: '1.1rem'
      }}>
        {viewType === 'table' ? '📊 Table View Coming Soon' : '🌳 Tree View Coming Soon'}
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <svg
        ref={svgRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          background: 'transparent'
        }}
      />
      
      {/* Loading overlay */}
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