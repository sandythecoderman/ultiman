import React, { useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';

const D3Graph = ({ graphData, setGraphData, onNodeSelect }) => {
  const svgRef = useRef(null);
  const simulationRef = useRef(null);
  const nodesRef = useRef([]);
  const linksRef = useRef([]);

  // Color mapping for categories - matching unified color scheme
  const getCategoryColor = useCallback((category) => {
    const colorMap = {
      'module': '#6366f1',     // Indigo - Core system modules
      'feature': '#10b981',    // Emerald - Feature functionality  
      'entity': '#f59e0b',     // Amber - Data entities
      'workflow': '#ef4444',   // Red - Process workflows
      'user': '#8b5cf6',       // Purple - User-related
      'document': '#06b6d4',   // Cyan - Documentation
      'system': '#84cc16',     // Lime - System components
      'process': '#ec4899',    // Pink - Business processes
      'data': '#3b82f6',       // Blue - Data objects
      'api': '#f97316',        // Orange - API endpoints
      // Legacy mappings for backward compatibility
      'architecture': '#6366f1',
      'apis': '#f97316', 
      'services': '#84cc16',
      'docs': '#06b6d4'
    };
    return colorMap[category.toLowerCase()] || '#6b7280';
  }, []);

  // Handle node expansion
  const handleNodeExpand = useCallback(async (event, nodeData) => {
    event.stopPropagation();
    event.preventDefault();
    
    try {
      console.log('🔍 Expanding node:', nodeData.id);
      console.log('🌐 Making API call to expand node...');
      
      const response = await fetch('http://localhost:8001/api/expand-node', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nodeId: nodeData.id }),
      });

      console.log('📡 API Response status:', response.status);
      console.log('📡 API Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      console.log('📊 API Response data:', responseData);
      const { nodes: newNodes, edges: newEdges } = responseData;
      
      if (newNodes.length === 0) {
        console.log('ℹ️ No children found for node:', nodeData.id);
        return;
      }

      console.log(`✅ Found ${newNodes.length} new nodes and ${newEdges.length} new edges`);

      // Merge new data with existing data
      const existingNodeIds = new Set(graphData.nodes.map(n => n.id));
      const existingEdgeIds = new Set((graphData.relationships || graphData.edges || []).map(e => e.id));

      const filteredNewNodes = newNodes.filter(node => !existingNodeIds.has(node.id));
      const filteredNewEdges = newEdges.filter(edge => !existingEdgeIds.has(edge.id));

      if (filteredNewNodes.length === 0 && filteredNewEdges.length === 0) {
        console.log('ℹ️ All nodes already exist in graph');
        return;
      }

      // Position new nodes near the expanded node
      const expandedNode = graphData.nodes.find(n => n.id === nodeData.id);
      if (expandedNode) {
        filteredNewNodes.forEach((node, index) => {
          const angle = (index / filteredNewNodes.length) * 2 * Math.PI;
          const radius = 100;
          node.x = (expandedNode.x || 0) + Math.cos(angle) * radius;
          node.y = (expandedNode.y || 0) + Math.sin(angle) * radius;
          node.radius = 30;
          node.isExpanded = false;
        });
      }

      // Update graph data  
      setGraphData({
        ...graphData,
        nodes: [...graphData.nodes, ...filteredNewNodes],
        edges: [...(graphData.edges || []), ...filteredNewEdges],
        relationships: [...(graphData.relationships || []), ...filteredNewEdges]
      });

    } catch (error) {
      console.error('❌ Error expanding node:', error);
    }
  }, [graphData, setGraphData]);

  // Handle node click
  const handleNodeClick = useCallback((event, nodeData) => {
    event.stopPropagation();
    console.log('🖱️ Node clicked:', nodeData.id);
    if (onNodeSelect) {
      onNodeSelect(nodeData);
    }
  }, [onNodeSelect]);

  // Drag functions
  const dragstarted = useCallback((event, d) => {
    if (!event.active && simulationRef.current) {
      simulationRef.current.alphaTarget(0.3).restart();
    }
    d.fx = d.x;
    d.fy = d.y;
  }, []);

  const dragged = useCallback((event, d) => {
    d.fx = event.x;
    d.fy = event.y;
  }, []);

  const dragended = useCallback((event, d) => {
    if (!event.active && simulationRef.current) {
      simulationRef.current.alphaTarget(0);
    }
    d.fx = null;
    d.fy = null;
  }, []);

  // Main D3 effect
  useEffect(() => {
    console.log('🎯 D3Graph useEffect triggered:', {
      hasSvgRef: !!svgRef.current,
      nodeCount: graphData.nodes?.length || 0,
      relationshipCount: graphData.relationships?.length || 0,
      edgeCount: graphData.edges?.length || 0
    });
    
    if (!svgRef.current || !graphData.nodes.length) {
      console.log('❌ D3Graph: Missing svgRef or no nodes');
      return;
    }

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth || 800;
    const height = svgRef.current.clientHeight || 600;
    
    // Set explicit viewBox to ensure SVG renders properly
    svg.attr("viewBox", `0 0 ${width} ${height}`);
    console.log(`📐 SVG dimensions: ${width}x${height}`);

    // Clear previous content
    svg.selectAll("*").remove();

    // Create zoom behavior and disable double-click zoom
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        graphContainer.attr("transform", event.transform);
      });

    svg.call(zoom)
       .on("dblclick.zoom", null); // Disable double-click zoom

    // Create main container
    const graphContainer = svg.append("g").attr("class", "graph-container");

    // Prepare data
    const nodes = graphData.nodes.map(d => ({
      ...d,
      radius: d.radius || 30,
      isExpanded: d.isExpanded || false
    }));

    // Use relationships first, then edges as fallback  
    const links = (graphData.relationships || graphData.edges || []).map(d => ({
      ...d,
      source: d.source,
      target: d.target
    }));

    console.log(`🔗 Rendering ${nodes.length} nodes and ${links.length} links from ${graphData.relationships?.length || 0} relationships`);

    // Store references for simulation
    nodesRef.current = nodes;
    linksRef.current = links;

    // Create force simulation
    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(80))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(d => d.radius + 5));

    simulationRef.current = simulation;

    // Create links
    const linkElements = graphContainer
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 2);

    // Create link labels
    const linkLabels = graphContainer
      .append("g")
      .attr("class", "link-labels")
      .selectAll("text")
      .data(links)
      .join("text")
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("fill", "#666")
      .attr("pointer-events", "none")
      .text(d => d.type);

    // Create node groups
    const nodeGroups = graphContainer
      .append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("class", "node")
      .style("cursor", "pointer")
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    // Add circles to nodes
    nodeGroups
      .append("circle")
      .attr("r", d => d.radius)
      .attr("fill", d => getCategoryColor(d.category))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .on("click", function(event, d) {
        console.log('🖱️ Node clicked:', d.id);
        handleNodeClick(event, d);
      })
      .on("dblclick", function(event, d) {
        console.log('🖱️🖱️ Node double-clicked:', d.id);
        event.preventDefault();
        event.stopPropagation();
        handleNodeExpand(event, d);
      })
      .on("mouseover", function(event, d) {
        d3.select(this).attr("stroke-width", 4);
        
        // Show tooltip
        const tooltip = d3.select("body")
          .append("div")
          .attr("class", "d3-tooltip")
          .style("position", "absolute")
          .style("background", "rgba(0, 0, 0, 0.8)")
          .style("color", "white")
          .style("padding", "8px")
          .style("border-radius", "4px")
          .style("font-size", "12px")
          .style("pointer-events", "none")
          .style("z-index", 1000)
          .html(`
            <strong>${d.name}</strong><br/>
            Category: ${d.category}<br/>
            Labels: ${d.labels ? d.labels.join(', ') : 'None'}<br/>
            Double-click to expand
          `);

        tooltip
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px");
      })
      .on("mouseout", function() {
        d3.select(this).attr("stroke-width", 2);
        d3.selectAll(".d3-tooltip").remove();
      });

    // Add text labels to nodes
    nodeGroups
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("font-size", d => d.radius > 30 ? "12px" : "10px")
      .attr("font-weight", "600")
      .attr("fill", "#fff")
      .attr("pointer-events", "none")
      .each(function(d) {
        const text = d3.select(this);
        const words = d.name.split(/\s+/);
        const maxChars = d.radius > 30 ? 12 : 8;
        
        if (words.length === 1) {
          if (d.name.length <= maxChars) {
            text.text(d.name);
          } else {
            text.text(d.name.substring(0, maxChars - 2) + "...");
          }
        } else {
          const firstWord = words[0];
          if (firstWord.length <= maxChars) {
            text.text(firstWord);
          } else {
            const abbrev = words.map(word => word.charAt(0).toUpperCase()).join('');
            if (abbrev.length <= 6) {
              text.text(abbrev);
            } else {
              text.text(abbrev.substring(0, 4) + "...");
            }
          }
        }
      });

    // Update positions on simulation tick
    simulation.on("tick", () => {
      linkElements
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      linkLabels
        .attr("x", d => (d.source.x + d.target.x) / 2)
        .attr("y", d => (d.source.y + d.target.y) / 2);

      nodeGroups
        .attr("transform", d => `translate(${d.x},${d.y})`);
    });

    // Cleanup function
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
      d3.selectAll(".d3-tooltip").remove();
    };

  }, [graphData, getCategoryColor, handleNodeClick, handleNodeExpand, dragstarted, dragged, dragended]);

  return (
    <div className="d3-graph-container" style={{ 
      width: '100%', 
      height: '100%', 
      minHeight: '600px',
      flex: '1 1 auto',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <svg
        ref={svgRef}
        className="d3-graph-svg"
        width="100%"
        height="100%"
        style={{ 
          background: 'var(--input-bg)', 
          display: 'block',
          flex: '1 1 auto',
          minHeight: '500px'
        }}
      />
    </div>
  );
};

export default D3Graph; 