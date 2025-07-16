import React from 'react';
import { FiDatabase, FiRefreshCw, FiSearch } from 'react-icons/fi';
import './Sidebar.css';

const Sidebar = ({ 
  schemaInfo, 
  searchTerm, 
  setSearchTerm, 
  selectedLabel, 
  setSelectedLabel,
  selectedRelType, 
  setSelectedRelType,
  onRefresh,
  isLoading 
}) => {
  
  const handleLabelClick = (labelName) => {
    setSelectedLabel(selectedLabel === labelName ? null : labelName);
  };

  const handleRelTypeClick = (relTypeName) => {
    setSelectedRelType(selectedRelType === relTypeName ? null : relTypeName);
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>Knowledge Base</h3>
        <button 
          className="refresh-btn" 
          onClick={onRefresh}
          disabled={isLoading}
          title="Refresh Data"
        >
          <FiRefreshCw className={isLoading ? 'spinning' : ''} />
        </button>
      </div>

      {/* Search Section */}
      <div className="sidebar-section">
        <div className="search-container">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Database Statistics */}
      <div className="sidebar-section">
        <h4 className="section-title">Database Overview</h4>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-value">
              {schemaInfo?.labels?.reduce((sum, label) => sum + label.count, 0) || 0}
            </span>
            <span className="stat-label">Total Nodes</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">
              {schemaInfo?.relationshipTypes?.reduce((sum, rel) => sum + rel.count, 0) || 0}
            </span>
            <span className="stat-label">Total Relationships</span>
          </div>
        </div>
      </div>

      {/* Node Labels */}
      <div className="sidebar-section scrollable">
        <h4 className="section-title">
          Node Labels 
          <span className="count-badge">
            ({schemaInfo?.labels?.length || 0})
          </span>
        </h4>
        <div className="labels-container">
          {schemaInfo?.labels?.map((label, index) => (
            <div 
              key={index} 
              className={`label-item ${selectedLabel === label.name ? 'selected' : ''}`}
              onClick={() => handleLabelClick(label.name)}
            >
              <div className="label-indicator" />
              <div className="label-content">
                <span className="label-name">{label.name}</span>
                <span className="label-count">({label.count || 0})</span>
              </div>
            </div>
          ))}
          {(!schemaInfo?.labels || schemaInfo.labels.length === 0) && (
            <div className="no-data">
              <FiDatabase />
              <span>No labels found</span>
            </div>
          )}
        </div>
      </div>

      {/* Relationship Types */}
      <div className="sidebar-section scrollable">
        <h4 className="section-title">
          Relationship Types
          <span className="count-badge">
            ({schemaInfo?.relationshipTypes?.length || 0})
          </span>
        </h4>
        <div className="relationships-container">
          {schemaInfo?.relationshipTypes?.map((relType, index) => (
            <div 
              key={index} 
              className={`relationship-item ${selectedRelType === relType.name ? 'selected' : ''}`}
              onClick={() => handleRelTypeClick(relType.name)}
            >
              <div className="relationship-indicator" />
              <div className="relationship-content">
                <span className="relationship-name">{relType.name}</span>
                <span className="relationship-count">({relType.count || 0})</span>
              </div>
            </div>
          ))}
          {(!schemaInfo?.relationshipTypes || schemaInfo.relationshipTypes.length === 0) && (
            <div className="no-data">
              <FiDatabase />
              <span>No relationship types found</span>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="sidebar-section">
        <div className="instructions">
          <h5>Instructions</h5>
          <ul>
            <li>Click nodes to select them</li>
            <li>Double-click nodes to expand and show children</li>
            <li>Drag nodes to move them around</li>
            <li>Use mouse wheel to zoom in/out</li>
            <li>Click labels/relationships to filter</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Sidebar; 