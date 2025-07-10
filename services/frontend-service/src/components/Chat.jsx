import React, { useState, useEffect, useRef } from 'react';
import { FiSend } from 'react-icons/fi';
import toast, { Toaster } from 'react-hot-toast';
import './Chat.css';
import SkeletonLoader from './SkeletonLoader';

const Chat = ({ onSendMessage, onFirstMessage }) => {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages, isThinking]);

  const handleSend = async () => {
    const query = inputValue.trim();
    if (!query || isThinking) return;

    if (messages.length === 0 && onFirstMessage) {
      onFirstMessage();
    }

    const userMessage = { sender: 'user', text: query };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsThinking(true);

    try {
      const agentResponse = await onSendMessage(query);
      
      const agentMessage = { 
        sender: 'agent', 
        text: agentResponse.response || 'Sorry, I had trouble understanding that.' 
      };
      setMessages(prev => [...prev, agentMessage]);

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = { 
        sender: 'agent', 
        text: error.message || 'Failed to fetch. Please check the backend logs.',
        isError: true,
        query: query
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleRetry = async (failedQuery) => {
    setMessages(prev => prev.filter(msg => !(msg.isError && msg.query === failedQuery)));
    // Re-run the send logic
    // This is a simplified version. A more robust implementation might be needed.
  };

  return (
    <div className="chat-container">
      <div className="messages-container">
        {messages.length === 0 && !isThinking && (
          <div className="empty-chat-placeholder">
            <p>Start a conversation to build your workflow.</p>
          </div>
        )}
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.sender} ${msg.isError ? 'error' : ''}`}>
            {msg.text}
            {msg.isError && (
              <button onClick={() => handleRetry(msg.query)} className="retry-button">
                Retry
              </button>
            )}
          </div>
        ))}
        {isThinking && (
          <div className="message agent thinking-indicator">
            <span></span><span></span><span></span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form
        className="chat-form"
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
      >
        <input
          type="text"
          className="chat-input"
          placeholder="Ask me anything..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
        <button type="submit" className="send-button" disabled={isThinking}>
          <FiSend />
        </button>
      </form>
      <Toaster position="bottom-center" />
    </div>
  );
};

export default Chat; 