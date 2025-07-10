import React, { useState } from 'react';
import Chat from '../components/Chat';

function Home() {
  const [hasStarted, setHasStarted] = useState(false);

  const handleFirstMessage = () => {
    setHasStarted(true);
  };

  const handleSendMessage = async (query) => {
    const response = await fetch('http://localhost:8001/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  };

  return (
    <div className={`home-page-container ${hasStarted ? 'chat-active' : ''}`}>
      {!hasStarted && (
        <div className="title-container">
          <h1 className="title title-glow">Man-O-Man</h1>
          <p className="subtitle">Your AI-powered workflow assistant</p>
        </div>
      )}
      <div className="chat-area-wrapper">
        <Chat onSendMessage={handleSendMessage} onFirstMessage={handleFirstMessage} />
      </div>
    </div>
  );
}

export default Home; 