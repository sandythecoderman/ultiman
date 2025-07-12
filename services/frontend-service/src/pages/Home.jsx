import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowRight, FiCode, FiFileText, FiZap, FiSend, FiCommand, FiSearch, FiTrendingUp, FiClock, FiStar, FiMic, FiTerminal, FiCircle, FiRotateCw, FiLayers, FiGlobe, FiDroplet, FiMusic } from 'react-icons/fi';

const recentPrompts = [
  {
    text: "Create a customer onboarding workflow for our SaaS product",
    category: "Business",
    popular: true,
  },
  {
    text: "Set up automated email campaigns for lead nurturing",
    category: "Marketing",
    popular: false,
  },
  {
    text: "Design a content approval process for social media posts",
    category: "Content",
    popular: true,
  },
  {
    text: "Build an employee training workflow with assessments",
    category: "HR",
    popular: false,
  },
  {
    text: "Create a bug tracking and resolution workflow",
    category: "Development",
    popular: true,
  },
];

const promptSuggestions = [
  "Create a customer onboarding workflow",
  "Set up automated email campaigns",
  "Design a content approval process",
  "Build an employee training workflow",
  "Create a bug tracking workflow"
];

const categories = [
  { name: "Business", icon: "📊", count: 12 },
  { name: "Marketing", icon: "📈", count: 8 },
  { name: "HR", icon: "👥", count: 6 },
  { name: "Development", icon: "💻", count: 15 },
];

// Dynamic Knowledge Graph Icon Component
function KnowledgeGraphIcon({ size = 24, isActive = false }) {
  const [nodes, setNodes] = useState([]);
  const [connections, setConnections] = useState([]);

  useEffect(() => {
    // Initialize nodes with random positions within the icon bounds
    const initialNodes = [
      { id: 1, x: 12, y: 8, delay: 0 },
      { id: 2, x: 6, y: 16, delay: 0.3 },
      { id: 3, x: 18, y: 16, delay: 0.6 },
      { id: 4, x: 3, y: 12, delay: 0.9 },
      { id: 5, x: 21, y: 12, delay: 1.2 },
      { id: 6, x: 12, y: 20, delay: 1.5 },
    ];

    // Define connections between nodes
    const nodeConnections = [
      { from: 1, to: 2, delay: 1.8 },
      { from: 1, to: 3, delay: 2.1 },
      { from: 2, to: 4, delay: 2.4 },
      { from: 3, to: 5, delay: 2.7 },
      { from: 2, to: 6, delay: 3.0 },
      { from: 3, to: 6, delay: 3.3 },
    ];

    setNodes(initialNodes);
    setConnections(nodeConnections);
  }, []);

  const getConnectionPath = (from, to) => {
    const fromNode = nodes.find(n => n.id === from);
    const toNode = nodes.find(n => n.id === to);
    if (!fromNode || !toNode) return '';
    
    return `M ${fromNode.x} ${fromNode.y} L ${toNode.x} ${toNode.y}`;
  };

  return (
    <div className="knowledge-graph-icon" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 24 24">
        {/* Connections */}
        <g className="connections">
          {connections.map((conn, index) => (
            <path
              key={`conn-${index}`}
              d={getConnectionPath(conn.from, conn.to)}
              className="connection-line"
              style={{ animationDelay: `${conn.delay}s` }}
            />
          ))}
        </g>
        
        {/* Nodes */}
        <g className="nodes">
          {nodes.map((node) => (
            <g key={node.id} className="node-group">
              {/* Node glow effect */}
              <circle
                cx={node.x}
                cy={node.y}
                r="3"
                className="node-glow"
                style={{ animationDelay: `${node.delay}s` }}
              />
              {/* Main node */}
              <circle
                cx={node.x}
                cy={node.y}
                r="1.5"
                className="node-core"
                style={{ animationDelay: `${node.delay}s` }}
              />
              {/* Node pulse ring */}
              <circle
                cx={node.x}
                cy={node.y}
                r="2"
                className="node-pulse"
                style={{ animationDelay: `${node.delay + 0.5}s` }}
              />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}

function FloatingOrbSearch({ onPromptSubmit, onSearchActivate }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [showCategories, setShowCategories] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

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
    }
  }, [isExpanded]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        if (!inputValue.trim()) {
          setIsExpanded(false);
          setShowCategories(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [inputValue]);

  const handleOrbClick = () => {
    setIsExpanded(true);
    setShowCategories(true);
    if (onSearchActivate) onSearchActivate();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onPromptSubmit(inputValue);
      setInputValue('');
      setIsExpanded(false);
      setShowCategories(false);
    }
  };

  const handlePromptSelect = (prompt) => {
    onPromptSubmit(typeof prompt === 'string' ? prompt : prompt.text);
    setIsExpanded(false);
    setShowCategories(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsExpanded(false);
      setShowCategories(false);
      setInputValue('');
    }
  };

  return (
    <div className="floating-orb-container" ref={containerRef}>
      {!isExpanded ? (
        <div className="floating-orb" onClick={handleOrbClick}>
          <div className="orb-inner">
            <div className="orb-icon">
              <KnowledgeGraphIcon size={32} isActive={false} />
            </div>
            <div className="orb-pulse"></div>
            <div className="orb-suggestion">
              {promptSuggestions[suggestionIndex]}
            </div>
          </div>
        </div>
      ) : (
        <div className="command-palette">
          <form onSubmit={handleSubmit} className="command-form">
            <div className="command-header">
              <FiSearch className="search-icon" />
              <input
                ref={inputRef}
                type="text"
                className="command-input"
                placeholder="Describe your workflow..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete="off"
                spellCheck="false"
              />
              <button 
                type="submit" 
                className="command-send"
                disabled={!inputValue.trim()}
                title="Create workflow"
              >
                <FiSend />
              </button>
            </div>
          </form>

          {showCategories && (
            <div className="command-content">
              <div className="command-section">
                <div className="section-header">
                  <FiClock className="section-icon" />
                  <span>Recent</span>
                </div>
                <div className="command-list">
                  {recentPrompts.slice(0, 3).map((prompt, index) => (
                    <div 
                      key={index}
                      className="command-item"
                      onClick={() => handlePromptSelect(prompt)}
                    >
                      <div className="command-item-content">
                        <span className="command-text">{prompt.text}</span>
                        <div className="command-meta">
                          <span className="command-category">{prompt.category}</span>
                          {prompt.popular && <FiStar className="popular-icon" />}
                        </div>
                      </div>
                      <FiArrowRight className="command-arrow" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="command-section">
                <div className="section-header">
                  <FiZap className="section-icon" />
                  <span>Categories</span>
                </div>
                <div className="categories-grid">
                  {categories.map((category, index) => (
                    <div key={index} className="category-item">
                      <div className="category-icon">{category.icon}</div>
                      <span className="category-name">{category.name}</span>
                      <span className="category-count">{category.count}</span>
                    </div>
                  ))}
                </div>
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

  const handlePromptSubmit = (prompt) => {
    setIsNavigating(true);
    setTimeout(() => {
      navigate('/workflow', { state: { prompt } });
    }, 400); // Match this with animation duration
  };

  return (
    <div className={`home-page-container ${isNavigating ? 'navigating' : ''}`}>
      <div className="hero-section">
        <div className="title-container">
          <h1 className="title-glow minimalist-title">
            <span className="title-part">Man</span>
            <span className="title-orb-wrapper">
              <FloatingOrbSearch onPromptSubmit={handlePromptSubmit} />
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