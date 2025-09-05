import React, { useRef, useEffect, useState } from 'react';

const ImageCanvas = ({ imageData, confidenceThreshold = 0 }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [useImageFallback, setUseImageFallback] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Generate random colors for different labels
  const getColorForLabel = (label) => {
    // Simple hash function for consistent colors per label
    let hash = 0;
    for (let i = 0; i < label.length; i++) {
      hash = label.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Convert hash to HSL for better color distribution
    const hue = Math.abs(hash) % 360;
    const saturation = 70 + (Math.abs(hash >> 8) % 30); // 70-100%
    const lightness = 45 + (Math.abs(hash >> 16) % 20); // 45-65%
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  const drawImageWithBoundingBoxes = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageData) return;

    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    // Don't set crossOrigin to avoid CORS issues with Azure Blob Storage
    // img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      console.log('Image loaded successfully:', imageData.imageUrl);
      
      // For 100% resolution viewing, use the actual image dimensions scaled by zoom
      let baseCanvasWidth = img.width;
      let baseCanvasHeight = img.height;
      
      // If not in fullscreen, fit to container while maintaining aspect ratio
      if (!isFullscreen) {
        const maxWidth = containerRef.current ? containerRef.current.clientWidth : 800;
        const maxHeight = 600;
        const aspectRatio = img.width / img.height;
        
        if (aspectRatio > maxWidth / maxHeight) {
          baseCanvasWidth = Math.min(maxWidth, img.width);
          baseCanvasHeight = baseCanvasWidth / aspectRatio;
        } else {
          baseCanvasHeight = Math.min(maxHeight, img.height);
          baseCanvasWidth = baseCanvasHeight * aspectRatio;
        }
      }
      
      // Apply zoom level to get actual canvas size
      const canvasWidth = baseCanvasWidth * zoomLevel;
      const canvasHeight = baseCanvasHeight * zoomLevel;
      
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      setCanvasSize({ width: canvasWidth, height: canvasHeight });
      
      // Calculate scaling factors from original image to current canvas
      const scaleX = canvasWidth / img.width;
      const scaleY = canvasHeight / img.height;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      
      // Draw the image at full resolution scaled by zoom
      ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
      
      // Draw bounding boxes - filter by confidence threshold
      const filteredBboxes = imageData.bboxes.filter(bbox => bbox.confidence >= confidenceThreshold);
      
      filteredBboxes.forEach((bbox, index) => {
        const { box, label, confidence } = bbox;
        const color = getColorForLabel(label);
        
        // Scale coordinates according to current zoom and canvas size
        const x1 = box.x1 * scaleX;
        const y1 = box.y1 * scaleY;
        const x2 = box.x2 * scaleX;
        const y2 = box.y2 * scaleY;
        
        const width = x2 - x1;
        const height = y2 - y1;
        
        // Draw bounding box with appropriate line width
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(2, 3 * Math.min(zoomLevel, 1));
        ctx.strokeRect(x1, y1, width, height);
        
        // Draw text label with appropriate size
        const text = `${label} (${(confidence * 100).toFixed(0)}%)`;
        const fontSize = Math.max(10, Math.min(18, 14 * Math.min(zoomLevel, 1.5)));
        ctx.font = `${fontSize}px Arial`;
        const textMetrics = ctx.measureText(text);
        const textWidth = textMetrics.width;
        const textHeight = fontSize;
        const padding = Math.max(2, 4 * Math.min(zoomLevel, 1));
        
        // Background for text
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.8;
        ctx.fillRect(
          x1, 
          y1 - textHeight - padding, 
          textWidth + padding * 2, 
          textHeight + padding
        );
        
        // Draw text
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'white';
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.fillText(text, x1 + padding, y1 - padding);
      });
      
      setImageLoaded(true);
    };

    img.onerror = (error) => {
      console.error('Canvas image load failed:', imageData.imageUrl, error);
      setImageLoaded(false);
      setImageError(true);
      
      // Fall back to regular img element
      setUseImageFallback(true);
      
      // Try to load a placeholder or show error message
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        canvas.width = 400;
        canvas.height = 300;
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, 400, 300);
        ctx.fillStyle = '#dc3545';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Canvas loading failed', 200, 140);
        ctx.font = '12px Arial';
        ctx.fillText('Trying image fallback...', 200, 160);
        ctx.fillText(imageData.filename, 200, 180);
      }
    };

    console.log('Attempting to load image:', imageData.imageUrl);
    img.src = imageData.imageUrl;
  };

  useEffect(() => {
    if (imageData) {
      setImageLoaded(false);
      setUseImageFallback(false);
      setImageError(false);
      setZoomLevel(1);
      setPanOffset({ x: 0, y: 0 });
      drawImageWithBoundingBoxes();
    }
  }, [imageData, isFullscreen, zoomLevel, confidenceThreshold]);

  useEffect(() => {
    // Handle escape key for fullscreen and window resize
    const handleKeyPress = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    const handleResize = () => {
      if (isFullscreen && imageData) {
        drawImageWithBoundingBoxes();
      }
    };

    if (isFullscreen) {
      document.addEventListener('keydown', handleKeyPress);
      window.addEventListener('resize', handleResize);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('resize', handleResize);
      document.body.style.overflow = 'auto';
    };
  }, [isFullscreen, imageData]);

  // Zoom functions
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev * 1.25, 10)); // Max zoom 10x for high resolution
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev / 1.25, 0.1)); // Min zoom 0.1x
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleZoomToFit = () => {
    if (!containerRef.current || !imageData) return;
    
    const img = new Image();
    img.onload = () => {
      const containerWidth = isFullscreen ? window.innerWidth : containerRef.current.clientWidth;
      const containerHeight = isFullscreen ? window.innerHeight : 600;
      
      const scaleX = containerWidth / img.width;
      const scaleY = containerHeight / img.height;
      const scale = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 100%
      
      setZoomLevel(scale);
      setPanOffset({ x: 0, y: 0 });
    };
    img.src = imageData.imageUrl;
  };

  const handleZoom100 = () => {
    // Set zoom to show image at 100% actual resolution
    if (!containerRef.current || !imageData) return;
    
    const img = new Image();
    img.onload = () => {
      if (isFullscreen) {
        setZoomLevel(1); // In fullscreen, 1:1 zoom shows actual pixels
      } else {
        // In windowed mode, calculate what zoom level gives us 100% resolution
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = 600;
        const aspectRatio = img.width / img.height;
        
        let baseWidth, baseHeight;
        if (aspectRatio > containerWidth / containerHeight) {
          baseWidth = Math.min(containerWidth, img.width);
          baseHeight = baseWidth / aspectRatio;
        } else {
          baseHeight = Math.min(containerHeight, img.height);
          baseWidth = baseHeight * aspectRatio;
        }
        
        const scale = img.width / baseWidth; // This gives us 100% resolution
        setZoomLevel(scale);
      }
      setPanOffset({ x: 0, y: 0 });
    };
    img.src = imageData.imageUrl;
  };

  // Mouse wheel zoom with better precision
  const handleWheel = (e) => {
    e.preventDefault();
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoomLevel = Math.max(0.1, Math.min(10, zoomLevel * zoomFactor));
    
    if (newZoomLevel !== zoomLevel) {
      // Zoom towards mouse position
      const zoomRatio = newZoomLevel / zoomLevel;
      setPanOffset(prev => ({
        x: prev.x - (x - prev.x) * (zoomRatio - 1),
        y: prev.y - (y - prev.y) * (zoomRatio - 1)
      }));
      setZoomLevel(newZoomLevel);
    }
  };

  // Pan functionality with improved handling
  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Only left mouse button
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - panOffset.x,
      y: e.clientY - panOffset.y
    });
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const newPanOffset = {
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    };
    
    // Optional: Add bounds checking to prevent panning too far
    if (isFullscreen && canvasSize.width > 0 && canvasSize.height > 0) {
      const maxPanX = Math.max(0, (canvasSize.width - window.innerWidth) / 2);
      const maxPanY = Math.max(0, (canvasSize.height - window.innerHeight) / 2);
      
      newPanOffset.x = Math.max(-maxPanX, Math.min(maxPanX, newPanOffset.x));
      newPanOffset.y = Math.max(-maxPanY, Math.min(maxPanY, newPanOffset.y));
    }
    
    setPanOffset(newPanOffset);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch support for mobile devices
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({
        x: touch.clientX - panOffset.x,
        y: touch.clientY - panOffset.y
      });
    }
    e.preventDefault();
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    setPanOffset({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    });
    e.preventDefault();
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (!imageData) {
    return <div className="loading">No image selected</div>;
  }

  return (
    <div className="canvas-container">
      <div className="canvas-controls">
        <div className="canvas-info">
          <h3>{imageData.filename}</h3>
          <p>{imageData.bboxCount} detections found</p>
          {canvasSize.width > 0 && (
            <p>Canvas: {Math.round(canvasSize.width)}×{Math.round(canvasSize.height)}px (Zoom: {Math.round(zoomLevel * 100)}%)</p>
          )}
        </div>
        <div className="control-buttons">
          <div className="zoom-controls">
            <button className="zoom-btn" onClick={handleZoomOut} title="Zoom Out">−</button>
            <button className="zoom-btn" onClick={handleZoomToFit} title="Zoom to Fit">Fit</button>
            <button className="zoom-btn" onClick={handleZoom100} title="100% Resolution">100%</button>
            <button className="zoom-btn" onClick={handleResetZoom} title="Reset Zoom">1:1</button>
            <button className="zoom-btn" onClick={handleZoomIn} title="Zoom In">+</button>
          </div>
          <button 
            className="fullscreen-btn" 
            onClick={toggleFullscreen}
          >
            {isFullscreen ? 'Exit Fullscreen (ESC)' : 'View Fullscreen'}
          </button>
        </div>
      </div>
      
      <div 
        ref={containerRef}
        className={`canvas-wrapper ${isFullscreen ? 'fullscreen' : ''}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          cursor: isDragging ? 'grabbing' : (zoomLevel > 1 || isFullscreen ? 'grab' : 'default'),
          userSelect: 'none'
        }}
      >
        {!imageLoaded && !useImageFallback && (
          <div className="loading">
            Loading image...
            <br />
            <small>{imageData.filename}</small>
          </div>
        )}
        
        {/* Canvas rendering */}
        <canvas
          ref={canvasRef}
          style={{ 
            display: imageLoaded && !useImageFallback ? 'block' : 'none',
            maxWidth: isFullscreen ? 'none' : '100%',
            width: isFullscreen ? 'auto' : '100%',
            height: 'auto',
            transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
            transformOrigin: 'center center'
          }}
        />
        
        {/* Fallback image element */}
        {useImageFallback && (
          <div className="image-fallback-container">
            <img
              ref={imgRef}
              src={imageData.imageUrl}
              alt={imageData.filename}
              className="fallback-image"
              style={{
                maxWidth: isFullscreen ? 'none' : '100%',
                width: isFullscreen ? 'auto' : '100%',
                height: 'auto',
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
                transformOrigin: 'center center',
                display: 'block'
              }}
              onLoad={() => {
                setImageLoaded(true);
                console.log('Fallback image loaded successfully');
              }}
              onError={() => {
                console.error('Fallback image also failed to load');
                setImageError(true);
              }}
            />
            
            {/* Overlay bounding boxes on fallback image */}
            {imageLoaded && (
              <svg
                className="bbox-overlay"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
                  transformOrigin: 'center center'
                }}
              >
                {imageData.bboxes
                  .filter(bbox => bbox.confidence >= confidenceThreshold)
                  .map((bbox, index) => {
                  const { box, label, confidence } = bbox;
                  const color = getColorForLabel(label);
                  
                  return (
                    <g key={index}>
                      <rect
                        x={box.x1}
                        y={box.y1}
                        width={box.x2 - box.x1}
                        height={box.y2 - box.y1}
                        fill="none"
                        stroke={color}
                        strokeWidth="3"
                      />
                      <rect
                        x={box.x1}
                        y={box.y1 - 20}
                        width={`${label.length * 8 + 20}px`}
                        height="20"
                        fill={color}
                        fillOpacity="0.8"
                      />
                      <text
                        x={box.x1 + 5}
                        y={box.y1 - 5}
                        fill="white"
                        fontSize="12"
                        fontWeight="bold"
                      >
                        {label} ({(confidence * 100).toFixed(0)}%)
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
        )}
        
        {imageError && !imageLoaded && (
          <div className="error-fallback">
            <h3>Image Loading Failed</h3>
            <p>Both canvas and image loading methods failed.</p>
            <p><strong>Possible causes:</strong></p>
            <ul>
              <li>Network connectivity issues</li>
              <li>CORS restrictions from the image server</li>
              <li>The image URL being temporarily unavailable</li>
              <li>Browser security restrictions</li>
            </ul>
            <p><strong>Image URL:</strong></p>
            <div className="url-display">{imageData.imageUrl}</div>
            <div className="button-group">
              <button 
                className="retry-btn"
                onClick={() => {
                  setImageLoaded(false);
                  setUseImageFallback(false);
                  setImageError(false);
                  drawImageWithBoundingBoxes();
                }}
              >
                Retry Canvas
              </button>
              <button 
                className="retry-btn"
                onClick={() => {
                  setUseImageFallback(true);
                  setImageError(false);
                }}
              >
                Try Image Fallback
              </button>
              <a 
                href={imageData.imageUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="retry-btn"
                style={{ textDecoration: 'none', display: 'inline-block' }}
              >
                Open in New Tab
              </a>
            </div>
          </div>
        )}
      </div>
      
      {isFullscreen && (
        <div className="fullscreen-overlay-info">
          <div className="info-text">
            Mouse wheel or +/− to zoom • Click and drag to pan • ESC to exit fullscreen
          </div>
          <div className="zoom-indicator">
            Zoom: {Math.round(zoomLevel * 100)}% 
            {zoomLevel >= 1 && ` (${zoomLevel >= 1 ? 'High' : 'Low'} Resolution)`}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageCanvas;
