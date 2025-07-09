import React, { useState } from 'react';

const StatelessChat = ({ onReasoningUpdate }) => {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState([]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const newMessages = [...messages, { sender: 'user', text: inputValue }];
    setMessages(newMessages);
    const currentInput = inputValue;
    setInputValue('');

    try {
      const response = await fetch('http://localhost:8000/stateless_chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: currentInput }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      const agentMessage = data.response || 'Sorry, I had trouble understanding that.';
      
      setMessages([...newMessages, { sender: 'agent', text: agentMessage }]);
      if (onReasoningUpdate) {
        onReasoningUpdate(data.reasoning_steps || []);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      setMessages([...newMessages, { sender: 'agent', text: 'Error connecting to the agent.' }]);
    }
  };

  return (
    <div className="stateless-chat">
      <div className="message-list">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.sender}`}>
            {msg.text}
          </div>
        ))}
      </div>
      <div className="chat-input-wrapper">
        <input
          type="text"
          className="chat-input"
          placeholder="Sub-search..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
        />
        <button className="icon-button send-button" onClick={handleSendMessage}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
    </div>
  );
};

export default StatelessChat; 