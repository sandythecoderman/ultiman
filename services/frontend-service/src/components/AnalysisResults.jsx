import React from 'react';
import './AnalysisResults.css';

const AnalysisResults = ({ analysis }) => {
  return (
    <div className="analysis-results">
      <h3>Analysis</h3>
      <div className="analysis-content">
        {analysis ? (
          <p>{analysis}</p>
        ) : (
          <p className="analysis-placeholder">
            Run an analysis to see the results here.
          </p>
        )}
      </div>
    </div>
  );
};

export default AnalysisResults; 