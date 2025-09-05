import React, { useState } from 'react';
import ImageSelector from './ImageSelector';
import ImageCanvas from './ImageCanvas';
import './App.css';

function App() {
  const [selectedImage, setSelectedImage] = useState(null);

  return (
    <div className="app-container">
      <h1>Image Review SPA</h1>
      <ImageSelector onSelect={setSelectedImage} />
      {selectedImage && (
        <ImageCanvas imageData={selectedImage} />
      )}
    </div>
  );
}

export default App;
