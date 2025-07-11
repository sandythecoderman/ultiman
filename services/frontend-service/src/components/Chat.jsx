import React, { useState, useEffect, useRef } from 'react';
import { 
  FiSend, 
  FiPaperclip, 
  FiMessageCircle, 
  FiRefreshCw, 
  FiSettings,
  FiClock,
  FiUser,
  FiCpu,
  FiPlus,
  FiTrash2,
  FiDownload
} from 'react-icons/fi';
import toast, { Toaster } from 'react-hot-toast';
import './Chat.css';
import { FILE_UPLOAD_ENDPOINT } from '../config';

const Chat = ({
  messages,
  onMessagesChange,
  onSendMessage,
  placeholder,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages, isThinking]);

  const handleSend = async () => {
    const query = inputValue.trim();
    if (!query || isThinking) return;

    const userMessage = { sender: 'user', text: query, timestamp: Date.now() };
    const newMessages = [...messages, userMessage];
    onMessagesChange(newMessages);

    setInputValue('');
    setIsThinking(true);

    const payload = {
      query,
      file_info: uploadedFile ? { filename: uploadedFile } : null,
    };

    // Clear the file context after sending
    if (uploadedFile) {
      setUploadedFile(null);
    }

    try {
      const agentResponse = await onSendMessage(payload);
      const agentMessage = {
        sender: 'agent',
        text: agentResponse.response || 'Sorry, I had trouble understanding that.',
        timestamp: Date.now(),
      };
      onMessagesChange([...newMessages, agentMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        sender: 'agent',
        text: error.message || 'Failed to fetch. Please check the backend logs.',
        isError: true,
        timestamp: Date.now(),
      };
      onMessagesChange([...newMessages, errorMessage]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    const toastId = toast.loading(`Uploading ${file.name}...`);

    try {
      const response = await fetch(FILE_UPLOAD_ENDPOINT, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'File upload failed');
      }

      const result = await response.json();
      toast.success(result.message || `${file.name} uploaded successfully!`, {
        id: toastId,
      });

      setUploadedFile(result.filename);

      // Optionally, add a message to the chat
      const uploadMessage = {
        sender: 'system',
        text: `You have successfully uploaded ${result.filename}. I will now use this context in our conversation.`,
        timestamp: Date.now(),
      };
      onMessagesChange([...messages, uploadMessage]);

    } catch (error) {
      toast.error(error.message || 'An unexpected error occurred.', {
        id: toastId,
      });
      console.error('File upload error:', error);
    } finally {
      // Reset file input
      event.target.value = null;
    }
  };

  const clearChat = () => {
    onMessagesChange([]);
  };

  const exportChat = () => {
    const chatData = {
      timestamp: new Date().toISOString(),
      messageCount: messages.length,
      messages: messages
    };
    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow-chat-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getMessageStats = () => {
    return {
      total: messages.length,
      user: messages.filter(m => m.sender === 'user').length,
      agent: messages.filter(m => m.sender === 'agent').length,
      errors: messages.filter(m => m.isError).length
    };
  };

  const stats = getMessageStats();

  return (
    <div className="wf-chat-panel">
      {/* Header Section */}
      <div className="wf-panel-section header">
        <div className="wf-chat-header">
          <div className="wf-chat-title">
            <FiMessageCircle className="wf-title-icon" />
            <span>Workflow Assistant</span>
          </div>
          <div className="wf-chat-actions">
            <button className="wf-icon-btn" onClick={clearChat} title="Clear Chat">
              <FiTrash2 />
            </button>
            <button className="wf-icon-btn" onClick={exportChat} title="Export Chat">
              <FiDownload />
            </button>
            <button className="wf-icon-btn" title="Settings">
              <FiSettings />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="wf-panel-section">
        <h4 className="wf-panel-title">Conversation Stats</h4>
        <div className="wf-stats-grid">
          <div className="wf-stat-item">
            <div className="wf-stat-value">{stats.total}</div>
            <div className="wf-stat-label">Messages</div>
          </div>
          <div className="wf-stat-item">
            <div className="wf-stat-value">{stats.user}</div>
            <div className="wf-stat-label">Your Messages</div>
          </div>
        </div>
      </div>

      {/* Messages Section */}
      <div className="wf-panel-section messages-section">
        <h4 className="wf-panel-title">
          <span>Conversation</span>
          <div className="wf-status-indicator">
            <div className={`wf-status-dot ${isThinking ? 'thinking' : 'ready'}`}></div>
            <span className="wf-status-text">{isThinking ? 'Thinking...' : 'Ready'}</span>
          </div>
        </h4>

        <div className="wf-messages-container">
          {messages.length === 0 ? (
            <div className="wf-empty-chat">
              <div className="wf-empty-icon">
                <FiMessageCircle />
              </div>
              <h3>Start Your Workflow</h3>
              <p>Describe the workflow you want to create and I'll help you build it step by step.</p>
              <div className="wf-suggestions">
                <div className="wf-suggestion-item" onClick={() => setInputValue("Create a workflow to process customer emails")}>
                  "Create a workflow to process customer emails"
                </div>
                <div className="wf-suggestion-item" onClick={() => setInputValue("Build a data analysis pipeline")}>
                  "Build a data analysis pipeline"
                </div>
                <div className="wf-suggestion-item" onClick={() => setInputValue("Automate social media posting")}>
                  "Automate social media posting"
                </div>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, index) => (
                <div key={index} className={`wf-message ${msg.sender} ${msg.isError ? 'error' : ''}`}>
                  <div className="wf-message-header">
                    <div className="wf-message-sender">
                      {msg.sender === 'user' ? <FiUser /> : msg.sender === 'agent' ? <FiCpu /> : <FiSettings />}
                      <span>{msg.sender === 'user' ? 'You' : msg.sender === 'agent' ? 'Assistant' : 'System'}</span>
                    </div>
                    {msg.timestamp && (
                      <div className="wf-message-time">
                        <FiClock size={12} />
                        {formatTime(msg.timestamp)}
                      </div>
                    )}
                  </div>
                  <div className="wf-message-content">
                    {msg.text}
                  </div>
                </div>
              ))}
              {isThinking && (
                <div className="wf-message agent thinking">
                  <div className="wf-message-header">
                    <div className="wf-message-sender">
                      <FiCpu />
                      <span>Assistant</span>
                    </div>
                  </div>
                  <div className="wf-message-content">
                    <div className="wf-thinking-indicator">
                      <div className="wf-thinking-dots">
                        <span></span><span></span><span></span>
                      </div>
                      <span className="wf-thinking-text">Processing your request...</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Section */}
      <div className="wf-panel-section input-section">
        {uploadedFile && (
          <div className="wf-uploaded-file">
            <FiPaperclip />
            <span>{uploadedFile}</span>
            <button onClick={() => setUploadedFile(null)}>×</button>
          </div>
        )}

        <form className="wf-chat-form" onSubmit={(e) => { e.preventDefault(); handleSend(); }}>
          <div className="wf-input-wrapper">
            <button
              type="button"
              className="wf-attachment-btn"
              onClick={() => fileInputRef.current.click()}
              title="Attach file"
            >
              <FiPaperclip />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <input
              type="text"
              className="wf-chat-input"
              placeholder={placeholder || "Describe your workflow idea..."}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            <button
              type="submit"
              className={`wf-send-btn ${inputValue.trim() ? 'active' : ''}`}
              disabled={isThinking || !inputValue.trim()}
              title="Send message"
            >
              <FiSend />
            </button>
          </div>
        </form>
      </div>

      <Toaster position="bottom-center" />
    </div>
  );
};

export default Chat; 