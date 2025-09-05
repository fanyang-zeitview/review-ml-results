import React from 'react';

const ConfidenceFilter = ({ threshold, onChange }) => {
  const handleSliderChange = (e) => {
    const value = parseFloat(e.target.value);
    onChange(value);
  };

  const getThresholdColor = (threshold) => {
    if (threshold < 0.3) return '#dc3545'; // Red for low confidence
    if (threshold < 0.7) return '#ffc107'; // Yellow for medium confidence
    return '#28a745'; // Green for high confidence
  };

  const formatPercentage = (value) => {
    return Math.round(value * 100);
  };

  return (
    <div className="confidence-filter">
      <div className="filter-header">
        <h3>Confidence Score Filter</h3>
        <div 
          className="threshold-display"
          style={{ color: getThresholdColor(threshold) }}
        >
          {formatPercentage(threshold)}%
        </div>
      </div>
      
      <div className="slider-container">
        <div className="slider-labels">
          <span>0%</span>
          <span className="current-threshold">
            Show detections with confidence ≥ {formatPercentage(threshold)}%
          </span>
          <span>100%</span>
        </div>
        
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={threshold}
          onChange={handleSliderChange}
          className="confidence-slider"
          style={{
            background: `linear-gradient(to right, 
              #dc3545 0%, 
              #ffc107 30%, 
              #28a745 70%, 
              #28a745 100%)`
          }}
        />
        
        <div className="confidence-markers">
          <div className="marker low">
            <div className="marker-line"></div>
            <span>Low (0-30%)</span>
          </div>
          <div className="marker medium">
            <div className="marker-line"></div>
            <span>Medium (30-70%)</span>
          </div>
          <div className="marker high">
            <div className="marker-line"></div>
            <span>High (70-100%)</span>
          </div>
        </div>
      </div>
      
      <div className="filter-actions">
        <button 
          className="preset-btn low"
          onClick={() => onChange(0.0)}
          disabled={threshold === 0.0}
        >
          Show All
        </button>
        <button 
          className="preset-btn medium"
          onClick={() => onChange(0.5)}
          disabled={threshold === 0.5}
        >
          Medium+ (50%)
        </button>
        <button 
          className="preset-btn high"
          onClick={() => onChange(0.8)}
          disabled={threshold === 0.8}
        >
          High (80%)
        </button>
        <button 
          className="preset-btn very-high"
          onClick={() => onChange(0.95)}
          disabled={threshold === 0.95}
        >
          Very High (95%)
        </button>
      </div>
    </div>
  );
};

export default ConfidenceFilter;
