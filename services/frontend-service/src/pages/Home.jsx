import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowRight, FiCode, FiFileText, FiZap, FiSend } from 'react-icons/fi';

const recentPrompts = [
  'Draft an email to a client about a project update',
  'Summarize the latest news on AI from a specific website',
  'Create a three-step workflow for social media posting',
];

const featureHighlights = [
  {
    icon: <FiZap />,
    title: 'Automated Workflows',
    description: 'Design and execute complex processes with natural language.',
  },
  {
    icon: <FiFileText />,
    title: 'File Analysis',
    description: 'Upload files and ask questions about their content.',
  },
  {
    icon: <FiCode />,
    title: 'Knowledge Integration',
    description: 'Connect to your documents for context-aware answers.',
  },
];

function PromptForm({ onPromptSubmit }) {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onPromptSubmit(inputValue);
    }
  };

  return (
    <form className="chat-form" onSubmit={handleSubmit}>
      <div className="chat-input-wrapper">
        <input
          type="text"
          className="chat-input"
          placeholder="Describe the workflow you want to create..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
        <button type="submit" className="icon-button send-button">
          <FiSend />
        </button>
      </div>
    </form>
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
          <h1 className="title-glow">Man-O-Man</h1>
          <p className="subtitle">Your AI-powered assistant. Start by describing a workflow.</p>
        </div>
        <div className="chat-area-wrapper">
          <PromptForm onPromptSubmit={handlePromptSubmit} />
        </div>
      </div>
      <div className="homepage-content">
        <div className="recent-prompts">
          <h3>Recently Used</h3>
          <ul>
            {recentPrompts.map((prompt, index) => (
              <li key={index} onClick={() => handlePromptSubmit(prompt)}>
                <span>{prompt}</span>
                <FiArrowRight />
              </li>
            ))}
          </ul>
        </div>
        <div className="feature-highlights">
          {featureHighlights.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-icon">{feature.icon}</div>
              <h4>{feature.title}</h4>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Home; 