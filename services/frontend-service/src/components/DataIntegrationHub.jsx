import React, { useState } from 'react';
import { 
  FiDatabase, FiGlobe, FiFileText, FiCloud, FiZap, FiPlus,
  FiSettings, FiEye, FiEdit3, FiTrash2, FiCheck, FiX,
  FiRefreshCw, FiDownload, FiUpload, FiLink
} from 'react-icons/fi';
import './DataIntegrationHub.css';

const DataIntegrationHub = ({ isVisible, onClose }) => {
  const [activeTab, setActiveTab] = useState('connections');
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [showNewConnection, setShowNewConnection] = useState(false);

  const connectionTypes = [
    {
      id: 'database',
      name: 'Database',
      icon: <FiDatabase />,
      color: '#3b82f6',
      description: 'Connect to SQL and NoSQL databases',
      examples: ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis']
    },
    {
      id: 'api',
      name: 'API',
      icon: <FiGlobe />,
      color: '#10b981',
      description: 'Connect to REST and GraphQL APIs',
      examples: ['REST API', 'GraphQL', 'Webhook', 'OAuth']
    },
    {
      id: 'file',
      name: 'File System',
      icon: <FiFileText />,
      color: '#f59e0b',
      description: 'Connect to local and cloud file systems',
      examples: ['CSV', 'JSON', 'Excel', 'PDF']
    },
    {
      id: 'cloud',
      name: 'Cloud Storage',
      icon: <FiCloud />,
      color: '#8b5cf6',
      description: 'Connect to cloud storage services',
      examples: ['AWS S3', 'Google Cloud', 'Azure Blob', 'Dropbox']
    }
  ];

  const connections = [
    {
      id: 1,
      name: 'Customer Database',
      type: 'database',
      status: 'connected',
      lastSync: '2 minutes ago',
      dataSize: '2.3 GB',
      tables: 12,
      connectionString: 'postgresql://user:pass@localhost:5432/customers',
      config: {
        host: 'localhost',
        port: 5432,
        database: 'customers',
        username: 'user'
      }
    },
    {
      id: 2,
      name: 'Salesforce API',
      type: 'api',
      status: 'connected',
      lastSync: '5 minutes ago',
      dataSize: '1.8 GB',
      tables: 8,
      connectionString: 'https://api.salesforce.com/v1',
      config: {
        baseUrl: 'https://api.salesforce.com/v1',
        apiKey: '***',
        authType: 'OAuth2'
      }
    },
    {
      id: 3,
      name: 'Customer Files',
      type: 'file',
      status: 'connected',
      lastSync: '1 hour ago',
      dataSize: '500 MB',
      tables: 3,
      connectionString: '/data/customers',
      config: {
        path: '/data/customers',
        fileTypes: ['csv', 'json'],
        autoRefresh: true
      }
    },
    {
      id: 4,
      name: 'AWS S3 Bucket',
      type: 'cloud',
      status: 'disconnected',
      lastSync: 'Never',
      dataSize: '0 B',
      tables: 0,
      connectionString: 's3://my-bucket/data',
      config: {
        bucket: 'my-bucket',
        region: 'us-east-1',
        accessKey: '***'
      }
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected': return '#10b981';
      case 'disconnected': return '#ef4444';
      case 'connecting': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'connected': return <FiCheck />;
      case 'disconnected': return <FiX />;
      case 'connecting': return <FiRefreshCw />;
      default: return <FiX />;
    }
  };

  const ConnectionCard = ({ connection }) => (
    <div className="connection-card">
      <div className="connection-header">
        <div className="connection-icon" style={{ backgroundColor: connectionTypes.find(t => t.id === connection.type)?.color }}>
          {connectionTypes.find(t => t.id === connection.type)?.icon}
        </div>
        <div className="connection-info">
          <h3 className="connection-name">{connection.name}</h3>
          <p className="connection-type">{connectionTypes.find(t => t.id === connection.type)?.name}</p>
        </div>
        <div className="connection-status">
          <div 
            className="status-indicator"
            style={{ backgroundColor: getStatusColor(connection.status) }}
          >
            {getStatusIcon(connection.status)}
          </div>
        </div>
      </div>

      <div className="connection-meta">
        <div className="meta-item">
          <span className="meta-label">Status:</span>
          <span className="meta-value" style={{ color: getStatusColor(connection.status) }}>
            {connection.status}
          </span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Last Sync:</span>
          <span className="meta-value">{connection.lastSync}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Data Size:</span>
          <span className="meta-value">{connection.dataSize}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Tables:</span>
          <span className="meta-value">{connection.tables}</span>
        </div>
      </div>

      <div className="connection-actions">
        <button 
          className="action-btn"
          onClick={() => setSelectedConnection(connection)}
        >
          <FiEye />
          View
        </button>
        <button className="action-btn">
          <FiSettings />
          Configure
        </button>
        <button className="action-btn">
          <FiRefreshCw />
          Sync
        </button>
        <button className="action-btn danger">
          <FiTrash2 />
          Remove
        </button>
      </div>
    </div>
  );

  const ConnectionDetails = ({ connection, onClose }) => (
    <div className="connection-details-overlay">
      <div className="connection-details-modal">
        <div className="details-header">
          <div className="details-title">
            <div className="connection-icon" style={{ backgroundColor: connectionTypes.find(t => t.id === connection.type)?.color }}>
              {connectionTypes.find(t => t.id === connection.type)?.icon}
            </div>
            <div>
              <h2>{connection.name}</h2>
              <p>{connectionTypes.find(t => t.id === connection.type)?.name} Connection</p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="details-content">
          <div className="details-section">
            <h3>Connection Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Status:</span>
                <span className="info-value" style={{ color: getStatusColor(connection.status) }}>
                  {connection.status}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Last Sync:</span>
                <span className="info-value">{connection.lastSync}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Data Size:</span>
                <span className="info-value">{connection.dataSize}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Tables:</span>
                <span className="info-value">{connection.tables}</span>
              </div>
            </div>
          </div>

          <div className="details-section">
            <h3>Configuration</h3>
            <div className="config-display">
              <pre>{JSON.stringify(connection.config, null, 2)}</pre>
            </div>
          </div>

          <div className="details-section">
            <h3>Connection String</h3>
            <div className="connection-string">
              <code>{connection.connectionString}</code>
              <button className="copy-btn">
                <FiDownload />
                Copy
              </button>
            </div>
          </div>
        </div>

        <div className="details-actions">
          <button className="btn-secondary">
            <FiEdit3 />
            Edit Configuration
          </button>
          <button className="btn-primary">
            <FiRefreshCw />
            Test Connection
          </button>
        </div>
      </div>
    </div>
  );

  const NewConnectionModal = ({ onClose }) => (
    <div className="new-connection-overlay">
      <div className="new-connection-modal">
        <div className="modal-header">
          <h2>Add New Connection</h2>
          <button className="close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="modal-content">
          <div className="connection-types">
            <h3>Choose Connection Type</h3>
            <div className="types-grid">
              {connectionTypes.map(type => (
                <div key={type.id} className="type-card">
                  <div className="type-icon" style={{ backgroundColor: type.color }}>
                    {type.icon}
                  </div>
                  <h4>{type.name}</h4>
                  <p>{type.description}</p>
                  <div className="type-examples">
                    {type.examples.map(example => (
                      <span key={example} className="example-tag">{example}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary">
            <FiPlus />
            Create Connection
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className={`data-integration-hub ${isVisible ? 'visible' : ''}`}>
        <div className="hub-header">
          <div className="header-content">
            <h2>Data Integration Hub</h2>
            <p>Connect and manage your data sources</p>
          </div>
          <div className="header-actions">
            <button className="btn-secondary">
              <FiDownload />
              Export
            </button>
            <button className="btn-primary" onClick={() => setShowNewConnection(true)}>
              <FiPlus />
              Add Connection
            </button>
            <button className="close-btn" onClick={onClose}>
              <FiX />
            </button>
          </div>
        </div>

        <div className="hub-tabs">
          <button 
            className={`tab-btn ${activeTab === 'connections' ? 'active' : ''}`}
            onClick={() => setActiveTab('connections')}
          >
            <FiLink />
            Connections
          </button>
          <button 
            className={`tab-btn ${activeTab === 'templates' ? 'active' : ''}`}
            onClick={() => setActiveTab('templates')}
          >
            <FiFileText />
            Templates
          </button>
          <button 
            className={`tab-btn ${activeTab === 'monitoring' ? 'active' : ''}`}
            onClick={() => setActiveTab('monitoring')}
          >
            <FiEye />
            Monitoring
          </button>
        </div>

        <div className="hub-content">
          {activeTab === 'connections' && (
            <div className="connections-tab">
              <div className="connections-header">
                <div className="connections-stats">
                  <div className="stat-item">
                    <span className="stat-value">{connections.length}</span>
                    <span className="stat-label">Total Connections</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">
                      {connections.filter(c => c.status === 'connected').length}
                    </span>
                    <span className="stat-label">Active</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">
                      {connections.filter(c => c.status === 'disconnected').length}
                    </span>
                    <span className="stat-label">Inactive</span>
                  </div>
                </div>
              </div>

              <div className="connections-grid">
                {connections.map(connection => (
                  <ConnectionCard key={connection.id} connection={connection} />
                ))}
              </div>

              {connections.length === 0 && (
                <div className="no-connections">
                  <FiDatabase className="no-data-icon" />
                  <h3>No Connections Found</h3>
                  <p>Get started by adding your first data connection</p>
                  <button className="btn-primary" onClick={() => setShowNewConnection(true)}>
                    <FiPlus />
                    Add Connection
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="templates-tab">
              <h3>Connection Templates</h3>
              <p>Pre-configured connection templates for common data sources</p>
              <div className="templates-placeholder">
                <FiFileText />
                <span>Templates coming soon...</span>
              </div>
            </div>
          )}

          {activeTab === 'monitoring' && (
            <div className="monitoring-tab">
              <h3>Connection Monitoring</h3>
              <p>Monitor the health and performance of your data connections</p>
              <div className="monitoring-placeholder">
                <FiEye />
                <span>Monitoring dashboard coming soon...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedConnection && (
        <ConnectionDetails 
          connection={selectedConnection} 
          onClose={() => setSelectedConnection(null)} 
        />
      )}

      {showNewConnection && (
        <NewConnectionModal onClose={() => setShowNewConnection(false)} />
      )}
    </>
  );
};

export default DataIntegrationHub; 