// Clean AddReviewForm.js with instant image preview and half-star ratings
import React, { useState, useEffect } from "react";
import { FiStar } from 'react-icons/fi';
import { supabase } from "../utils/supabaseClient";
import CloudinaryService from "../utils/cloudinaryService";
import { addReview } from "../utils/supabaseReviewService";

export default function AddReviewForm({ restaurantId }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [deviceId, setDeviceId] = useState('');

  const getDeviceId = () => {
    const STORAGE_KEY = 'restaurant_app_device_id';
    try {
      let storedDeviceId = localStorage.getItem(STORAGE_KEY);
      if (!storedDeviceId) {
        storedDeviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem(STORAGE_KEY, storedDeviceId);
      }
      return storedDeviceId;
    } catch (error) {
      if (!window.sessionDeviceId) {
        window.sessionDeviceId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      }
      return window.sessionDeviceId;
    }
  };

  const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    return input.trim().slice(0, 1000)
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  };

  const moderateContent = (text) => {
    const suspiciousPatterns = [
      /\b(hack|exploit|inject|malware|virus)\b/gi,
      /<script|javascript:|on\w+=/gi,
      /\b(admin|root|password|login)\b/gi
    ];
    return !suspiciousPatterns.some(pattern => pattern.test(text));
  };

  // Clean up preview URLs
  const cleanupPreviews = () => {
    filePreviews.forEach(preview => {
      URL.revokeObjectURL(preview.url);
    });
  };

  // Half-star rating functions
  const handleStarHover = (newRating) => {
    if (!submitting) {
      setHoverRating(newRating);
    }
  };

  const handleStarLeave = () => {
    if (!submitting) {
      setHoverRating(0);
    }
  };

  const handleRatingClick = (newRating) => {
    if (!submitting) {
      setRating(newRating);
    }
  };

  // Render interactive half-star rating
  const renderInteractiveStars = () => {
    const stars = [];
    const currentRating = hoverRating || rating;
    
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <div key={i} style={{ position: 'relative', display: 'inline-block', margin: '0 2px' }}>
          {/* Left half button (for .5 rating) */}
          <button
            type="button"
            onClick={() => handleRatingClick(i - 0.5)}
            onMouseEnter={() => handleStarHover(i - 0.5)}
            onMouseLeave={handleStarLeave}
            disabled={submitting}
            style={{
              position: 'absolute',
              left: 0,
              width: '50%',
              height: '32px',
              background: 'transparent',
              border: 'none',
              cursor: submitting ? 'not-allowed' : 'pointer',
              zIndex: 10
            }}
          />
          
          {/* Right half button (for full rating) */}
          <button
            type="button"
            onClick={() => handleRatingClick(i)}
            onMouseEnter={() => handleStarHover(i)}
            onMouseLeave={handleStarLeave}
            disabled={submitting}
            style={{
              position: 'absolute',
              right: 0,
              width: '50%',
              height: '32px',
              background: 'transparent',
              border: 'none',
              cursor: submitting ? 'not-allowed' : 'pointer',
              zIndex: 10
            }}
          />
          
          {/* Visual star */}
          <div style={{ position: 'relative', width: '32px', height: '32px' }}>
            {/* Background star (always gray) */}
            <FiStar style={{ 
              width: '32px', 
              height: '32px', 
              color: '#d1d5db', 
              position: 'absolute',
              top: 0,
              left: 0
            }} />
            
            {/* Half fill overlay */}
            {currentRating >= i - 0.5 && currentRating < i && (
              <div style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                overflow: 'hidden', 
                width: '50%',
                height: '32px'
              }}>
                <FiStar style={{ 
                  width: '32px', 
                  height: '32px', 
                  color: '#fbbf24', 
                  fill: '#fbbf24'
                }} />
              </div>
            )}
            
            {/* Full fill overlay */}
            {currentRating >= i && (
              <FiStar style={{ 
                width: '32px', 
                height: '32px', 
                color: '#fbbf24', 
                fill: '#fbbf24',
                position: 'absolute',
                top: 0,
                left: 0
              }} />
            )}
          </div>
        </div>
      );
    }
    
    return stars;
  };

  useEffect(() => {
    const currentDeviceId = getDeviceId();
    setDeviceId(currentDeviceId);
  }, []);

  // Cleanup previews on unmount
  useEffect(() => {
    return () => {
      cleanupPreviews();
    };
  }, []);

  // Handle file selection with instant preview creation
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;
    
    console.log('📁 Files selected:', files.length);
    
    // Validate with CloudinaryService if available
    if (CloudinaryService && typeof CloudinaryService.validateMultipleImages === 'function') {
      const validation = CloudinaryService.validateMultipleImages(files);
      if (!validation.valid) {
        alert(validation.error);
        return;
      }
    }

    // Clean up old previews
    cleanupPreviews();
    
    // Create new previews immediately
    const previews = files.map(file => ({
      file: file,
      url: URL.createObjectURL(file),
      name: file.name
    }));
    
    setSelectedFiles(files);
    setFilePreviews(previews);
    
    console.log('✅ Instant previews created for', previews.length, 'files');
  };

  // Remove image from selection
  const removeImage = (indexToRemove) => {
    // Clean up the specific preview URL
    if (filePreviews[indexToRemove]) {
      URL.revokeObjectURL(filePreviews[indexToRemove].url);
    }
    
    // Remove from both arrays
    setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    setFilePreviews(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  // Upload images during form submission
  const uploadImages = async () => {
    if (selectedFiles.length === 0) return [];

    console.log('🚀 Uploading', selectedFiles.length, 'images...');
    
    try {
      const result = await CloudinaryService.uploadMultipleImages(selectedFiles);
      
      if (result.success) {
        return result.uploadedImages;
      } else {
        throw new Error(`Failed to upload images: ${result.error}`);
      }
    } catch (error) {
      console.error('💥 Error uploading images:', error);
      throw error;
    }
  };

  async function handleSubmit(e) {
    e.preventDefault();
    
    const cleanComment = sanitizeInput(comment);
    const cleanReviewerName = sanitizeInput(reviewerName);
    
    if (rating === 0) {
      alert("Please select a rating");
      return;
    }
    
    if (cleanComment.trim() === "") {
      alert("Please write a comment");
      return;
    }
    
    if (cleanReviewerName.trim() === "") {
      alert("Please enter your name");
      return;
    }

    if (!moderateContent(cleanComment) || !moderateContent(cleanReviewerName)) {
      alert("Please review your content and remove any inappropriate language.");
      return;
    }

    setSubmitting(true);
    try {
      // Upload images if any are selected
      let imageUrls = [];
      
      if (selectedFiles.length > 0) {
        imageUrls = await uploadImages();
      }

      // Create review data
      const reviewData = {
        rating: rating,
        reviewerName: cleanReviewerName.slice(0, 100),
        comment: cleanComment.slice(0, 2000),
        images: imageUrls.slice(0, 5)
      };

      const success = await addReview(restaurantId, reviewData, deviceId);

      if (!success) {
        alert("Error submitting review. Please try again.");
        return;
      }

      // Success - reset everything
      setSuccessMsg("Thanks for your review!");
      setComment("");
      setReviewerName("");
      setRating(0);
      setHoverRating(0);
      
      // Clean up and reset images
      cleanupPreviews();
      setSelectedFiles([]);
      setFilePreviews([]);

      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMsg(""), 5000);

    } catch (error) {
      console.error('💥 Error submitting review:', error);
      alert("Error submitting review: " + error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 30, padding: 20, border: '1px solid #ddd', borderRadius: 8 }}>
      <h4>Leave a Review</h4>
      
      {/* Name Input */}
      <div style={{ marginBottom: 15 }}>
        <label>
          <strong>Your Name:</strong>
          <input
            type="text"
            value={reviewerName}
            onChange={e => setReviewerName(e.target.value)}
            disabled={submitting}
            maxLength={100}
            style={{ 
              display: "block", 
              width: "100%", 
              marginTop: 5, 
              padding: 8, 
              border: '1px solid #ccc',
              borderRadius: 4
            }}
            placeholder="Enter your name"
            required
          />
        </label>
      </div>

      {/* Half-Star Rating Section */}
      <div style={{ marginBottom: 15 }}>
        <label><strong>Your Rating:</strong></label>
        <div style={{ marginTop: 10, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: 8 }}>
            {renderInteractiveStars()}
          </div>
          
          {(hoverRating || rating) > 0 && (
            <p style={{ margin: '5px 0', fontSize: 14, fontWeight: 'bold', color: '#333' }}>
              {(hoverRating || rating).toFixed(1)} star{(hoverRating || rating) !== 1 ? 's' : ''}
            </p>
          )}
          
          <p style={{ margin: '5px 0', fontSize: 12, color: '#666' }}>
            Click left half for .5 rating, right half for full rating
          </p>
        </div>
      </div>

      {/* Comment */}
      <div style={{ marginBottom: 15 }}>
        <label>
          <strong>Comment:</strong>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={4}
            disabled={submitting}
            maxLength={2000}
            style={{ 
              display: "block", 
              width: "100%", 
              marginTop: 5, 
              padding: 8,
              border: '1px solid #ccc',
              borderRadius: 4,
              resize: 'vertical'
            }}
            placeholder="Share your experience..."
            required
          />
          <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
            {comment.length}/2000 characters
          </div>
        </label>
      </div>

      {/* Image Upload Section - NO UPLOAD BUTTON */}
      <div style={{ marginBottom: 15 }}>
        <label><strong>Add Photos (Optional - Max 5):</strong></label>
        
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          disabled={submitting || filePreviews.length >= 5}
          style={{ 
            display: 'block',
            marginTop: 8,
            marginBottom: 8,
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            width: '100%',
            backgroundColor: submitting ? '#f5f5f5' : 'white'
          }}
        />

        {/* Show selected file count */}
        {selectedFiles.length > 0 && (
          <div style={{ 
            fontSize: 12, 
            color: '#28a745', 
            marginBottom: 10,
            fontWeight: 'bold'
          }}>
            ✅ {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected and ready to upload with review
          </div>
        )}

        {/* INSTANT IMAGE PREVIEWS */}
        {filePreviews.length > 0 ? (
          <div style={{ marginTop: 10 }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
              gap: 15, 
              padding: 15,
              border: '1px solid #28a745',
              borderRadius: 8,
              backgroundColor: '#f8fff9'
            }}>
              {filePreviews.map((preview, index) => (
                <div key={index} style={{ position: 'relative' }}>
                  <img
                    src={preview.url}
                    alt={`Preview ${index + 1}`}
                    style={{ 
                      width: '100%', 
                      height: 100, 
                      objectFit: 'cover', 
                      borderRadius: 6,
                      border: '2px solid #28a745'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    disabled={submitting}
                    style={{
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: 24,
                      height: 24,
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      fontSize: 14,
                      fontWeight: 'bold',
                      opacity: submitting ? 0.5 : 1
                    }}
                  >
                    ×
                  </button>
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    color: 'white',
                    padding: '2px 5px',
                    fontSize: 10,
                    borderRadius: '0 0 6px 6px'
                  }}>
                    {preview.name.length > 12 ? preview.name.substring(0, 12) + '...' : preview.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ 
            marginTop: 10, 
            padding: 15, 
            border: '2px dashed #ccc', 
            borderRadius: 8, 
            textAlign: 'center',
            color: '#666',
            backgroundColor: '#fafafa'
          }}>
            📷 No photos selected. Choose files above to see instant previews.
          </div>
        )}
      </div>

      {/* Single Submit Button - No Upload Button */}
      <button 
        type="submit" 
        disabled={submitting || rating === 0}
        style={{
          padding: '12px 24px',
          backgroundColor: submitting || rating === 0 ? '#ccc' : '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          cursor: submitting || rating === 0 ? 'not-allowed' : 'pointer',
          fontSize: 16,
          fontWeight: 'bold',
          width: '100%'
        }}
      >
        {submitting 
          ? (selectedFiles.length > 0 ? "Uploading Photos & Submitting Review..." : "Submitting Review...") 
          : `Submit Review${selectedFiles.length > 0 ? ` with ${selectedFiles.length} Photo${selectedFiles.length !== 1 ? 's' : ''}` : ''}`
        }
      </button>
      
      {rating === 0 && !submitting && (
        <div style={{ fontSize: 12, color: '#dc3545', marginTop: 8, textAlign: 'center' }}>
          ⚠️ Please select a rating before submitting
        </div>
      )}
      
      {successMsg && (
        <div style={{ 
          color: "#28a745", 
          marginTop: 15, 
          padding: 12, 
          backgroundColor: '#d4edda',
          border: '1px solid #c3e6cb',
          borderRadius: 4,
          textAlign: 'center',
          fontWeight: 'bold'
        }}>
          ✅ {successMsg}
        </div>
      )}
    </form>
  );
}