import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowRight, FiCode, FiFileText, FiZap, FiSend, FiCommand, FiSearch, FiTrendingUp, FiClock, FiStar, FiMic, FiTerminal, FiCircle, FiRotateCw, FiLayers, FiGlobe, FiDroplet, FiMusic } from 'react-icons/fi';

// Advanced Dynamic Neural Network Background Component
function DynamicNeuralNetwork({ centralOrbRef }) {
  const canvasRef = useRef(null);
  const networkRef = useRef({
    nodes: [],
    connections: [],
    centralNode: null,
    animationId: null,
    lastSpawnTime: 0,
    spawnInterval: 4000, // Faster spawning - reduced from 8000
    maxNodes: 35, // More nodes - increased from 25
    dataFlowParticles: [],
    clusters: [],
    physics: {
      gravity: 0.02,
      repulsion: 20,
      spring: 0.005
    },
    interactiveNodes: [],
    soundEnabled: false,
    performanceMetrics: {
      fps: 0,
      nodeCount: 0,
      connectionCount: 0,
      particleCount: 0
    },
    searchMode: false,
    searchAnimationProgress: 0
  });
  const [isActive, setIsActive] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const network = networkRef.current;
    
    // Setup canvas
    const updateCanvasSize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
    };
    
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    // Mouse tracking for interactivity
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    
    window.addEventListener('mousemove', handleMouseMove);

    // Initialize central node (linked to orb position)
    const initializeCentralNode = () => {
      if (centralOrbRef?.current) {
        const orbRect = centralOrbRef.current.getBoundingClientRect();
        network.centralNode = {
          id: 'central',
          x: orbRect.left + orbRect.width / 2,
          y: orbRect.top + orbRect.height / 2,
          radius: 6,
          type: 'central',
          energy: 1,
          pulsePhase: 0,
          connections: []
        };
      }
    };

    // Enhanced node creation with focus on center spawning
    const createNode = (forcePosition = null, clusterId = null) => {
      if (network.nodes.length >= network.maxNodes) return null;

      let x, y;
      if (forcePosition) {
        x = forcePosition.x;
        y = forcePosition.y;
      } else {
        // Always spawn nodes from the center area
        if (network.centralNode) {
          const angle = Math.random() * Math.PI * 2;
          // Closer initial spawn distance
          const baseDistance = 80;
          const variableDistance = Math.random() * 200;
          const distance = baseDistance + variableDistance;
          
          x = network.centralNode.x + Math.cos(angle) * distance;
          y = network.centralNode.y + Math.sin(angle) * distance;
        } else {
          // Fallback to center of screen
          x = canvas.width / 2 + (Math.random() - 0.5) * 300;
          y = canvas.height / 2 + (Math.random() - 0.5) * 300;
        }
      }

      // Keep nodes within bounds
      x = Math.max(40, Math.min(canvas.width - 40, x));
      y = Math.max(40, Math.min(canvas.height - 40, y));

      const nodeTypes = ['standard', 'hub', 'relay', 'data', 'cluster', 'bridge'];
      const weights = [0.45, 0.15, 0.15, 0.1, 0.1, 0.05];
      const randValue = Math.random();
      let cumulativeWeight = 0;
      let selectedType = 'standard';
      
      for (let i = 0; i < nodeTypes.length; i++) {
        cumulativeWeight += weights[i];
        if (randValue <= cumulativeWeight) {
          selectedType = nodeTypes[i];
          break;
        }
      }

      const radiusMap = {
        'hub': 5,
        'cluster': 4,
        'bridge': 3,
        'relay': 3,
        'data': 2,
        'standard': 2
      };

      const node = {
        id: `node_${Date.now()}_${Math.random()}`,
        x,
        y,
        vx: 0,
        vy: 0,
        radius: radiusMap[selectedType],
        type: selectedType,
        energy: Math.random() * 0.5 + 0.5,
        pulsePhase: Math.random() * Math.PI * 2,
        connections: [],
        birthTime: Date.now(),
        lifespan: 30000 + Math.random() * 60000, // Shorter lifespan for more dynamic movement
        clusterId: clusterId || null,
        interactionRadius: radiusMap[selectedType] * 8,
        learningRate: Math.random() * 0.1 + 0.05,
        adaptiveWeight: 1,
        attractionForce: selectedType === 'hub' ? 2 : selectedType === 'cluster' ? 1.5 : 1
      };

      return node;
    };

    // Enhanced connection creation with central node bias
    const createConnections = (newNode) => {
      const connectionLimits = {
        'hub': 6,
        'cluster': 5,
        'bridge': 4,
        'relay': 3,
        'data': 2,
        'standard': 2
      };
      
      const distanceLimits = {
        'hub': 400,
        'cluster': 350,
        'bridge': 300,
        'relay': 280,
        'data': 250,
        'standard': 230
      };
      
      const maxConnections = connectionLimits[newNode.type];
      const maxDistance = distanceLimits[newNode.type];
      
      // PRIORITY: Always try to connect to central node first
      if (network.centralNode) {
        const distToCentral = Math.sqrt(
          Math.pow(newNode.x - network.centralNode.x, 2) + 
          Math.pow(newNode.y - network.centralNode.y, 2)
        );
        
        // Higher chance to connect to central node
        const centralConnectionChance = distToCentral <= (maxDistance * 2) ? 0.95 : 0.7;
        
        if (Math.random() < centralConnectionChance) {
          const connection = {
            id: `conn_${newNode.id}_central`,
            from: newNode.id,
            to: 'central',
            strength: Math.max(0.6, 1 - (distToCentral / (maxDistance * 1.2))),
            dataFlowDirection: Math.random() < 0.5 ? 'forward' : 'backward',
            createdAt: Date.now(),
            thickness: 0.8 + Math.random() * 0.4,
            pulseSpeed: 0.02 + Math.random() * 0.03,
            type: 'central'
          };
          
          network.connections.push(connection);
          newNode.connections.push(connection.id);
          network.centralNode.connections.push(connection.id);
        }
      }

      // Find nearby nodes for additional connections
      const nearbyNodes = network.nodes
        .filter(node => node.id !== newNode.id)
        .map(node => ({
          node,
          distance: Math.sqrt(
            Math.pow(newNode.x - node.x, 2) + 
            Math.pow(newNode.y - node.y, 2)
          )
        }))
        .filter(item => item.distance <= maxDistance)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, maxConnections - newNode.connections.length);

      // Create connections to nearby nodes
      nearbyNodes.forEach(item => {
        if (newNode.connections.length < maxConnections) {
          const connection = {
            id: `conn_${newNode.id}_${item.node.id}`,
            from: newNode.id,
            to: item.node.id,
            strength: Math.max(0.4, 1 - (item.distance / maxDistance)),
            dataFlowDirection: Math.random() < 0.5 ? 'forward' : 'backward',
            createdAt: Date.now(),
            thickness: 0.5 + Math.random() * 0.3,
            pulseSpeed: 0.01 + Math.random() * 0.02,
            type: 'standard'
          };
          
          network.connections.push(connection);
          newNode.connections.push(connection.id);
          item.node.connections.push(connection.id);
        }
      });
    };

    // Physics system - gentle mouse interaction only
    const applyPhysics = () => {
      network.nodes.forEach(node => {
        // Gentle mouse interaction
        const mouseDistX = mousePosition.x - node.x;
        const mouseDistY = mousePosition.y - node.y;
        const mouseDist = Math.sqrt(mouseDistX * mouseDistX + mouseDistY * mouseDistY);
        
        if (mouseDist < node.interactionRadius && mouseDist > 0) {
          const mouseForce = (node.interactionRadius - mouseDist) / node.interactionRadius * 0.02;
          node.x += (mouseDistX / mouseDist) * mouseForce;
          node.y += (mouseDistY / mouseDist) * mouseForce;
        }
        
        // Keep within bounds
        if (node.x < 50) node.x = 50;
        if (node.x > canvas.width - 50) node.x = canvas.width - 50;
        if (node.y < 50) node.y = 50;
        if (node.y > canvas.height - 50) node.y = canvas.height - 50;
      });
    };

    // Data flow particles
    const createDataParticle = (connectionId) => {
      const connection = network.connections.find(c => c.id === connectionId);
      if (!connection) return;

      const fromNode = connection.from === 'central' ? network.centralNode : 
                      network.nodes.find(n => n.id === connection.from);
      const toNode = connection.to === 'central' ? network.centralNode : 
                    network.nodes.find(n => n.id === connection.to);

      if (!fromNode || !toNode) return;

      const particle = {
        id: `particle_${Date.now()}_${Math.random()}`,
        connectionId,
        progress: 0,
        speed: connection.pulseSpeed || (0.01 + Math.random() * 0.02),
        size: 1 + Math.random() * 1.5,
        color: connection.type === 'central' ? '#10b981' : '#10b981', // All green now
        fromNode,
        toNode,
        createdAt: Date.now(),
        trail: []
      };

      network.dataFlowParticles.push(particle);
    };

    // Enhanced rendering functions with green colors
    const drawNode = (node) => {
      const time = Date.now() / 1000;
      const pulse = Math.sin(time * 2 + node.pulsePhase) * 0.3 + 0.7;
      const mouseDistX = mousePosition.x - node.x;
      const mouseDistY = mousePosition.y - node.y;
      const mouseDist = Math.sqrt(mouseDistX * mouseDistX + mouseDistY * mouseDistY);
      const isNearMouse = mouseDist < node.interactionRadius;
      
      ctx.save();
      
      // Enhanced glow with mouse interaction
      const glowRadius = node.radius * (isNearMouse ? 5 : 4);
      const gradient = ctx.createRadialGradient(
        node.x, node.y, 0,
        node.x, node.y, glowRadius
      );
      
      // Dynamic color scheme based on theme
      const isDarkMode = document.body.classList.contains('dark');
      const nodeColors = isDarkMode ? {
        'central': { core: '#10b981', glow: '16, 185, 129' },
        'hub': { core: '#059669', glow: '5, 150, 105' },
        'cluster': { core: '#34d399', glow: '52, 211, 153' },
        'bridge': { core: '#047857', glow: '4, 120, 87' },
        'relay': { core: '#065f46', glow: '6, 95, 70' },
        'data': { core: '#6ee7b7', glow: '110, 231, 183' },
        'standard': { core: '#10b981', glow: '16, 185, 129' }
      } : {
        'central': { core: '#8b5cf6', glow: '139, 92, 246' },
        'hub': { core: '#7c3aed', glow: '124, 58, 237' },
        'cluster': { core: '#a78bfa', glow: '167, 139, 250' },
        'bridge': { core: '#6d28d9', glow: '109, 40, 217' },
        'relay': { core: '#5b21b6', glow: '91, 33, 182' },
        'data': { core: '#c4b5fd', glow: '196, 181, 253' },
        'standard': { core: '#8b5cf6', glow: '139, 92, 246' }
      };
      
      const nodeColor = nodeColors[node.type] || nodeColors['standard'];
      const glowIntensity = pulse * (isNearMouse ? 1.2 : 0.8);
      
      gradient.addColorStop(0, `rgba(${nodeColor.glow}, ${glowIntensity})`);
      gradient.addColorStop(0.7, `rgba(${nodeColor.glow}, ${glowIntensity * 0.3})`);
      gradient.addColorStop(1, `rgba(${nodeColor.glow}, 0)`);
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(node.x, node.y, glowRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // 3D depth effect with multiple layers
      for (let i = 2; i >= 0; i--) {
        const layerRadius = node.radius * (1 - i * 0.15);
        const layerOpacity = 1 - i * 0.3;
        
        ctx.fillStyle = nodeColor.core + Math.floor(layerOpacity * 255).toString(16).padStart(2, '0');
        ctx.beginPath();
        ctx.arc(node.x, node.y, layerRadius, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();
    };

    const drawConnection = (connection) => {
      const fromNode = connection.from === 'central' ? network.centralNode : 
                      network.nodes.find(n => n.id === connection.from);
      const toNode = connection.to === 'central' ? network.centralNode : 
                    network.nodes.find(n => n.id === connection.to);

      if (!fromNode || !toNode) return;

      ctx.save();
      
      const time = Date.now() / 1000;
      const pulse = Math.sin(time * 4 + connection.createdAt * 0.001) * 0.3 + 0.7;
      
      // Dynamic gradient connections based on theme
      const isDarkMode = document.body.classList.contains('dark');
      const gradient = ctx.createLinearGradient(
        fromNode.x, fromNode.y,
        toNode.x, toNode.y
      );
      
      const opacity = connection.strength * pulse * 0.6;
      if (connection.type === 'central') {
        if (isDarkMode) {
          gradient.addColorStop(0, `rgba(16, 185, 129, ${opacity})`);
          gradient.addColorStop(0.5, `rgba(52, 211, 153, ${opacity * 1.2})`);
          gradient.addColorStop(1, `rgba(110, 231, 183, ${opacity})`);
        } else {
          gradient.addColorStop(0, `rgba(139, 92, 246, ${opacity})`);
          gradient.addColorStop(0.5, `rgba(167, 139, 250, ${opacity * 1.2})`);
          gradient.addColorStop(1, `rgba(196, 181, 253, ${opacity})`);
        }
      } else {
        if (isDarkMode) {
          gradient.addColorStop(0, `rgba(16, 185, 129, ${opacity * 0.8})`);
          gradient.addColorStop(1, `rgba(52, 211, 153, ${opacity * 0.8})`);
        } else {
          gradient.addColorStop(0, `rgba(139, 92, 246, ${opacity * 0.8})`);
          gradient.addColorStop(1, `rgba(167, 139, 250, ${opacity * 0.8})`);
        }
      }
      
      ctx.strokeStyle = gradient;
      ctx.lineWidth = connection.thickness * pulse;
      ctx.lineCap = 'round';
      
      // Draw connection with slight curve
      const midX = (fromNode.x + toNode.x) / 2;
      const midY = (fromNode.y + toNode.y) / 2;
      const controlOffset = 20;
      
      ctx.beginPath();
      ctx.moveTo(fromNode.x, fromNode.y);
      ctx.quadraticCurveTo(
        midX + (Math.random() - 0.5) * controlOffset,
        midY + (Math.random() - 0.5) * controlOffset,
        toNode.x, toNode.y
      );
      ctx.stroke();
      
      ctx.restore();
    };

    const drawDataParticle = (particle) => {
      const t = particle.progress;
      const x = particle.fromNode.x + (particle.toNode.x - particle.fromNode.x) * t;
      const y = particle.fromNode.y + (particle.toNode.y - particle.fromNode.y) * t;
      
      ctx.save();
      
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, particle.size * 2);
      gradient.addColorStop(0, particle.color);
      gradient.addColorStop(1, particle.color.replace(/[^,]+(?=\))/, '0'));
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
    };

    // Main animation loop
    const animate = () => {
      const frameStartTime = performance.now();
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const currentTime = Date.now();
      
      // Update central node position
      if (centralOrbRef?.current) {
        const orbRect = centralOrbRef.current.getBoundingClientRect();
        if (network.centralNode) {
          network.centralNode.x = orbRect.left + orbRect.width / 2;
          network.centralNode.y = orbRect.top + orbRect.height / 2;
        }
      }
      
      // Apply physics
      applyPhysics();
      
      // Spawn new nodes more frequently
      if (currentTime - network.lastSpawnTime > network.spawnInterval && isActive) {
        const newNode = createNode();
        
        if (newNode) {
          network.nodes.push(newNode);
          createConnections(newNode);
          network.lastSpawnTime = currentTime;
          
          // Create data particles more frequently
          if (Math.random() < 0.3) {
            newNode.connections.forEach(connId => {
              if (Math.random() < 0.15) {
                setTimeout(() => createDataParticle(connId), Math.random() * 1500 + 500);
              }
            });
          }
        }
      }
      
      // Remove old nodes
      network.nodes = network.nodes.filter(node => {
        const age = currentTime - node.birthTime;
        const isOld = age >= node.lifespan;
        
        if (isOld) {
          node.energy *= 0.95;
          return node.energy > 0.1;
        }
        return true;
      });
      
      // Clean up broken connections
      network.connections = network.connections.filter(conn => {
        const fromExists = conn.from === 'central' || network.nodes.some(n => n.id === conn.from);
        const toExists = conn.to === 'central' || network.nodes.some(n => n.id === conn.to);
        return fromExists && toExists;
      });
      
      // Update data particles
      network.dataFlowParticles = network.dataFlowParticles.filter(particle => {
        particle.progress += particle.speed;
        return particle.progress <= 1;
      });
      
      // Create new data particles occasionally
      if (Math.random() < 0.05 && network.connections.length > 0) {
        const randomConnection = network.connections[Math.floor(Math.random() * network.connections.length)];
        createDataParticle(randomConnection.id);
      }
      
      // Render everything
      network.connections.forEach(drawConnection);
      network.dataFlowParticles.forEach(drawDataParticle);
      
      if (network.centralNode) {
        drawNode(network.centralNode);
      }
      
      network.nodes
        .sort((a, b) => a.radius - b.radius)
        .forEach(drawNode);
      
      network.animationId = requestAnimationFrame(animate);
    };

    // Start the system
    initializeCentralNode();
    setIsActive(true);
    animate();

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      window.removeEventListener('mousemove', handleMouseMove);
      if (network.animationId) {
        cancelAnimationFrame(network.animationId);
      }
    };
  }, [centralOrbRef, isActive]);

  return (
    <canvas
      ref={canvasRef}
      className="neural-network-canvas"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0
      }}
    />
  );
}

const recentSearches = [
  "Create a customer onboarding workflow",
  "Set up automated email campaigns", 
  "Design a content approval process",
  "Build an employee training workflow",
  "Create a bug tracking workflow"
];

const suggestions = [
  "Create a customer onboarding workflow for new users",
  "Set up automated email campaigns for marketing",
  "Design a content approval process for social media",
  "Build an employee training workflow with assessments",
  "Create a bug tracking workflow for development team",
  "Set up project management workflow",
  "Design invoice approval process",
  "Create lead nurturing email sequence",
  "Build document review workflow",
  "Set up expense approval system"
];

const promptSuggestions = [
  "Create a customer onboarding workflow",
  "Set up automated email campaigns",
  "Design a content approval process",
  "Build an employee training workflow",
  "Create a bug tracking workflow"
];

// Simple Hollow Circle Orb Component
function SimpleHollowOrb({ size = 50 }) {
  return (
    <div className="simple-hollow-orb" style={{ width: size, height: size }}>
      <div className="hollow-circle"></div>
    </div>
  );
}

// Enhanced Center Search Interface
function CenterSearch({ onPromptSubmit, onSearchActivate, centralOrbRef, onExpandedChange }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Notify parent when expanded state changes
  useEffect(() => {
    if (onExpandedChange) {
      onExpandedChange(isExpanded);
    }
  }, [isExpanded, onExpandedChange]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isExpanded && !inputValue) {
        setSuggestionIndex((prev) => (prev + 1) % promptSuggestions.length);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [isExpanded, inputValue]);

  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
      setShowDropdown(true);
    }
  }, [isExpanded]);

  useEffect(() => {
    if (inputValue.trim()) {
      // Filter suggestions based on input
      const filtered = suggestions.filter(suggestion =>
        suggestion.toLowerCase().includes(inputValue.toLowerCase())
      ).slice(0, 5);
      setFilteredSuggestions(filtered);
    } else {
      // Show recent searches when input is empty
      setFilteredSuggestions(recentSearches.slice(0, 5));
    }
  }, [inputValue]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        if (!inputValue.trim()) {
          setIsExpanded(false);
          setShowDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [inputValue]);

  const handleOrbClick = () => {
    setIsExpanded(true);
    setShowDropdown(true);
    if (onSearchActivate) onSearchActivate();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onPromptSubmit(inputValue);
      setInputValue('');
      setIsExpanded(false);
      setShowDropdown(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    onPromptSubmit(suggestion);
    setInputValue('');
    setIsExpanded(false);
    setShowDropdown(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsExpanded(false);
      setShowDropdown(false);
      setInputValue('');
    }
  };

  const handleInputFocus = () => {
    setShowDropdown(true);
  };

  return (
    <div className="center-search-container" ref={containerRef}>
      {!isExpanded ? (
        <div className="floating-orb" onClick={handleOrbClick} ref={centralOrbRef}>
          <div className="orb-inner">
            <div className="orb-icon">
              <SimpleHollowOrb size={50} />
            </div>
            <div className="orb-suggestion">
              {promptSuggestions[suggestionIndex]}
            </div>
          </div>
        </div>
      ) : (
        <div className="center-search-expanded">
          <form onSubmit={handleSubmit} className="minimal-search-form">
            <input
              ref={inputRef}
              type="text"
              className="minimal-search-input"
              placeholder="Describe what you want to create..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={handleInputFocus}
              autoComplete="off"
              spellCheck="false"
            />
            <button 
              type="submit" 
              className="minimal-search-submit"
              disabled={!inputValue.trim()}
            >
              <FiArrowRight />
            </button>
          </form>
          
          {showDropdown && (
            <div className="search-dropdown">
              <div className="dropdown-header">
                {inputValue.trim() ? 'Suggestions' : 'Recent Searches'}
              </div>
              <div className="dropdown-items">
                {filteredSuggestions.map((item, index) => (
                  <div
                    key={index}
                    className="dropdown-item"
                    onClick={() => handleSuggestionClick(item)}
                  >
                    <FiSearch className="dropdown-icon" />
                    <span className="dropdown-text">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Home() {
  const navigate = useNavigate();
  const [isNavigating, setIsNavigating] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const centralOrbRef = useRef(null);

  const handlePromptSubmit = (prompt) => {
    setIsNavigating(true);
    setTimeout(() => {
      navigate('/workflow', { state: { prompt } });
    }, 400);
  };

  const handleSearchExpandedChange = (expanded) => {
    setIsSearchExpanded(expanded);
  };

  return (
    <div className={`home-page-container ${isNavigating ? 'navigating' : ''}`}>
      <DynamicNeuralNetwork 
        centralOrbRef={centralOrbRef}
      />
      <div className="hero-section">
        <div className={`title-container ${isSearchExpanded ? 'search-expanded' : ''}`}>
          <h1 className="title-glow minimalist-title">
            <span className="title-part">Man</span>
            <span className="title-orb-wrapper">
              <CenterSearch 
                onPromptSubmit={handlePromptSubmit} 
                centralOrbRef={centralOrbRef}
                onExpandedChange={handleSearchExpandedChange}
              />
            </span>
            <span className="title-part">Man</span>
          </h1>
          <p className="subtitle">Your AI-powered assistant. Start by describing a workflow.</p>
        </div>
      </div>
    </div>
  );
}

export default Home;