import React from 'react';
import { FiShare2, FiPlay } from 'react-icons/fi';
import './EmptyWorkflow.css';

const EmptyWorkflow = ({ onGenerate }) => {
  return (
    <div className="empty-workflow-container">
      <div className="empty-icon">
        <FiShare2 size={48} />
      </div>
      <h2>Your Workflow Canvas</h2>
      <p>Describe the workflow you want to create in the chat on the left.</p>
      <div className="example-prompts">
        <span>For example:</span>
        <ul>
          <li>"Create a workflow to draft an email from a blog post."</li>
          <li>"Summarize the content of a website."</li>
        </ul>
      </div>
      {onGenerate && (
        <div className="quick-actions">
          <button 
            onClick={() => onGenerate("Create a simple data processing workflow")}
            className="quick-action-btn"
          >
            <FiPlay /> Quick Start
          </button>
        </div>
      )}
    </div>
  );
};

export default EmptyWorkflow; 