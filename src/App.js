import React, { useState } from 'react';
import ImageSelector from './components/ImageSelector';
import ImageCanvas from './components/ImageCanvas';
import ConfidenceFilter from './components/ConfidenceFilter';
import './App.css';

function App() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.0);

  return (
    <div className="app-container">
      <h1>PGE ML Results Review</h1>
      
      <ConfidenceFilter 
        threshold={confidenceThreshold}
        onChange={setConfidenceThreshold}
      />
      
      <ImageSelector 
        onSelect={setSelectedImage} 
        confidenceThreshold={confidenceThreshold}
      />
      
      {selectedImage && (
        <ImageCanvas 
          imageData={selectedImage} 
          confidenceThreshold={confidenceThreshold}
        />
      )}
    </div>
  );
}

export default App;
