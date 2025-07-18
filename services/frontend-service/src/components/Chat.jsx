import React, { useState, useEffect, useRef } from 'react';
import { 
  FiSend, 
  FiPaperclip, 
  FiMessageCircle, 
  FiRefreshCw, 
  FiMoreHorizontal,
  FiUser,
  FiCpu,
  FiSettings
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
  const [showActions, setShowActions] = useState(false);
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

  return (
    <div className="wf-chat-panel">
      {/* Messages Section */}
      <div className="wf-messages-section">
        <div className="wf-messages-container">
          {messages.length === 0 ? (
            <div className="wf-empty-chat">
              <div className="wf-empty-icon">
                <FiMessageCircle />
              </div>
              <h3>Start Building</h3>
              <p>Describe your workflow idea and I'll help create it.</p>
              <div className="wf-quick-prompts">
                <button onClick={() => setInputValue("Create a customer email workflow")}>
                  📧 Email Processing
                </button>
                <button onClick={() => setInputValue("Build a data analysis pipeline")}>
                  📊 Data Analysis
                </button>
                <button onClick={() => setInputValue("Automate content creation")}>
                  ✨ Content Automation
                </button>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, index) => (
                <div key={index} className={`wf-message ${msg.sender} ${msg.isError ? 'error' : ''}`}>
                  <div className="wf-message-avatar">
                    {msg.sender === 'user' ? <FiUser /> : msg.sender === 'agent' ? <FiCpu /> : <FiSettings />}
                  </div>
                  <div className="wf-message-content">
                    {msg.text}
                  </div>
                </div>
              ))}
              {isThinking && (
                <div className="wf-message agent thinking">
                  <div className="wf-message-avatar">
                    <FiCpu />
                  </div>
                  <div className="wf-message-content">
                    <div className="wf-thinking-indicator">
                      <div className="wf-thinking-dots">
                        <span></span><span></span><span></span>
                      </div>
                      <span>Analyzing your request...</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Minimal Input Section */}
      <div className="wf-input-section">
        {uploadedFile && (
          <div className="wf-uploaded-file">
            <FiPaperclip />
            <span>{uploadedFile}</span>
            <button onClick={() => setUploadedFile(null)}>×</button>
          </div>
        )}

        <form className="wf-chat-form" onSubmit={(e) => { e.preventDefault(); handleSend(); }}>
          <div className="wf-input-wrapper">
            <input
              type="text"
              className="wf-chat-input"
              placeholder={placeholder || "Describe your workflow..."}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
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