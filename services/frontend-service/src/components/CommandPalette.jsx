import React, { useState, useEffect, useRef } from 'react';

const CommandPalette = ({ isOpen, onClose, onCommand }) => {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // Focus the input when the palette opens
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
  
  const handleCommandSubmit = () => {
    if (!inputValue.trim()) return;
    onCommand(inputValue);
    setInputValue('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div className="command-palette" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          type="text"
          className="command-input"
          placeholder="e.g., 'generate: a user onboarding workflow'"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCommandSubmit()}
        />
        <div className="command-hint">
          Try: <code>generate:</code>, <code>analyze</code>, or search for a node by name.
        </div>
      </div>
    </div>
  );
};

export default CommandPalette; 