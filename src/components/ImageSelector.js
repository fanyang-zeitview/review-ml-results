import React, { useState, useEffect, useCallback } from 'react';

const ImageSelector = ({ onSelect, confidenceThreshold = 0 }) => {
  const [images, setImages] = useState([]);
  const [filteredImages, setFilteredImages] = useState([]);
  const [displayedImages, setDisplayedImages] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedImageId, setSelectedImageId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  
  const ITEMS_PER_PAGE = 6;

  // Calculate filtered detection count for an image
  const getFilteredDetectionCount = (image) => {
    return image.bboxes.filter(bbox => bbox.confidence >= confidenceThreshold).length;
  };

  // Calculate total filtered detections across all displayed images
  const getTotalFilteredDetections = () => {
    return displayedImages.reduce((total, image) => {
      return total + getFilteredDetectionCount(image);
    }, 0);
  };

  useEffect(() => {
    // Load the PGE data
    fetch('/pge-data.json')
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load data: ${response.status} ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('Data loaded successfully:', data.length, 'images found');
        console.log('First image URL:', data[0]?.image);
        
        // Add unique IDs and extract filenames
        const processedImages = data.map((item, index) => {
          const filename = item.image.split('/').pop();
          const uniqueLabels = [...new Set(item.bboxes.map(bbox => bbox.label))];
          
          return {
            id: index,
            filename,
            imageUrl: item.image,
            bboxes: item.bboxes,
            uniqueLabels,
            bboxCount: item.bboxes.length
          };
        });
        
        setImages(processedImages);
        setFilteredImages(processedImages);
        setDisplayedImages(processedImages.slice(0, ITEMS_PER_PAGE));
        setCurrentPage(0);
        setHasMore(processedImages.length > ITEMS_PER_PAGE);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading data:', err);
        setError(`Failed to load data: ${err.message}`);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    // Filter images based on search term
    if (!searchTerm) {
      setFilteredImages(images);
      setDisplayedImages(images.slice(0, ITEMS_PER_PAGE));
      setCurrentPage(0);
      setHasMore(images.length > ITEMS_PER_PAGE);
    } else {
      const filtered = images.filter(image => 
        image.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        image.uniqueLabels.some(label => 
          label.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
      setFilteredImages(filtered);
      setDisplayedImages(filtered.slice(0, ITEMS_PER_PAGE));
      setCurrentPage(0);
      setHasMore(filtered.length > ITEMS_PER_PAGE);
    }
  }, [searchTerm, images]);

  // Load more images function
  const loadMoreImages = useCallback(() => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    
    // Simulate loading delay for better UX
    setTimeout(() => {
      const nextPage = currentPage + 1;
      const startIndex = nextPage * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      const newImages = filteredImages.slice(startIndex, endIndex);
      
      if (newImages.length > 0) {
        setDisplayedImages(prev => [...prev, ...newImages]);
        setCurrentPage(nextPage);
        setHasMore(endIndex < filteredImages.length);
      } else {
        setHasMore(false);
      }
      
      setLoadingMore(false);
    }, 300);
  }, [filteredImages, currentPage, loadingMore, hasMore]);

  // Scroll handler for infinite scroll
  const handleScroll = useCallback((e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    
    // Load more when scrolled to bottom
    if (scrollHeight - scrollTop <= clientHeight + 100 && hasMore && !loadingMore) {
      loadMoreImages();
    }
  }, [hasMore, loadingMore, loadMoreImages]);

  const handleImageSelect = (image) => {
    setSelectedImageId(image.id);
    onSelect(image);
  };

  if (loading) {
    return <div className="loading">Loading images...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="image-selector">
      <input
        type="text"
        placeholder="Search by filename or label..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="search-box"
      />
      
      <div className="results-info">
        Showing {displayedImages.length} of {filteredImages.length} images
        {searchTerm && ` (filtered from ${images.length} total)`}
        <br />
        <span className="detection-stats">
          {getTotalFilteredDetections()} detection(s) visible 
          {confidenceThreshold > 0 && ` (≥${Math.round(confidenceThreshold * 100)}% confidence)`}
        </span>
      </div>
      
      <div 
        className="image-list"
        onScroll={handleScroll}
      >
        {displayedImages.map(image => (
          <div
            key={image.id}
            className={`image-item ${selectedImageId === image.id ? 'selected' : ''}`}
            onClick={() => handleImageSelect(image)}
          >
            <img
              src={image.imageUrl}
              alt={image.filename}
              className="image-preview"
              onError={(e) => {
                // Hide the broken image and show a placeholder
                e.target.style.display = 'none';
                
                // Create a placeholder div if it doesn't exist
                if (!e.target.nextSibling || !e.target.nextSibling.classList?.contains('image-placeholder')) {
                  const placeholder = document.createElement('div');
                  placeholder.className = 'image-placeholder';
                  placeholder.innerHTML = '<div class="placeholder-text">Image<br/>Preview<br/>Unavailable</div>';
                  e.target.parentNode.insertBefore(placeholder, e.target.nextSibling);
                }
              }}
              onLoad={(e) => {
                // If image loads successfully, remove any placeholder
                const placeholder = e.target.nextSibling;
                if (placeholder && placeholder.classList?.contains('image-placeholder')) {
                  placeholder.remove();
                }
              }}
            />
            <div className="image-info">
              <div className="image-filename">{image.filename}</div>
              <div className="bbox-count">
                {getFilteredDetectionCount(image)} of {image.bboxCount} detection(s)
                {confidenceThreshold > 0 && ` (≥${Math.round(confidenceThreshold * 100)}%)`}
              </div>
              <div className="labels">
                {[...new Set(
                  image.bboxes
                    .filter(bbox => bbox.confidence >= confidenceThreshold)
                    .map(bbox => bbox.label)
                )].map(label => (
                  <span key={label} className="label-tag">{label}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
        
        {loadingMore && (
          <div className="loading-more">
            <div className="loading-spinner"></div>
            <span>Loading more images...</span>
          </div>
        )}
        
        {!hasMore && displayedImages.length > 0 && (
          <div className="end-of-results">
            <span>All images loaded</span>
          </div>
        )}
      </div>
      
      {filteredImages.length === 0 && !loading && (
        <div className="loading">No images found matching your search.</div>
      )}
      
      {hasMore && !loadingMore && displayedImages.length > 0 && (
        <button 
          className="load-more-btn"
          onClick={loadMoreImages}
        >
          Load More Images ({filteredImages.length - displayedImages.length} remaining)
        </button>
      )}
    </div>
  );
};

export default ImageSelector;
