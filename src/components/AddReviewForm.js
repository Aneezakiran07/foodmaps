// Fixed AddReviewForm.js - Updated to match new schema
import React, { useState, useEffect } from "react";
import { supabase } from "../utils/supabaseClient";
import CloudinaryService from "../utils/cloudinaryService";
import { addReview } from "../utils/supabaseReviewService";

export default function AddReviewForm({ restaurantId }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [images, setImages] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [userIP, setUserIP] = useState("anonymous");

  // Input sanitization function
  const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    return input.trim().slice(0, 1000)
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  };

  // Content moderation function
  const moderateContent = (text) => {
    const suspiciousPatterns = [
      /\b(hack|exploit|inject|malware|virus)\b/gi,
      /<script|javascript:|on\w+=/gi,
      /\b(admin|root|password|login)\b/gi
    ];
    
    return !suspiciousPatterns.some(pattern => pattern.test(text));
  };

  // Get user's IP address
  useEffect(() => {
    const fetchUserIP = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        setUserIP(sanitizeInput(data.ip));
      } catch (error) {
        console.log("Could not fetch IP, using 'anonymous'");
      }
    };

    fetchUserIP();
  }, []);

  // Debug CloudinaryService on mount
  useEffect(() => {
    console.log('CloudinaryService in AddReviewForm:', CloudinaryService);
    console.log('Environment variables:', {
      cloudName: process.env.REACT_APP_CLOUDINARY_CLOUD_NAME,
      uploadPreset: process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET
    });
  }, []);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    
    console.log('Files selected:', files.length);
    
    // Check if CloudinaryService is available
    if (!CloudinaryService || typeof CloudinaryService.validateMultipleImages !== 'function') {
      console.error('CloudinaryService.validateMultipleImages is not available');
      alert('Image service not available. Please refresh the page.');
      return;
    }
    
    // Validate images
    const validation = CloudinaryService.validateMultipleImages(files);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setSelectedFiles(files);
  };

  const uploadImages = async () => {
    if (selectedFiles.length === 0) return [];

    console.log('Starting image upload...');
    setUploadingImages(true);
    
    try {
      const result = await CloudinaryService.uploadMultipleImages(selectedFiles);
      console.log('Upload result:', result);
      
      if (result.success) {
        setImages(prev => [...prev, ...result.uploadedImages]);
        setSelectedFiles([]);
        return result.uploadedImages;
      } else {
        alert(`Failed to upload ${result.failedUploads} images. Error: ${result.error}`);
        return [];
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Failed to upload images: ' + error.message);
      return [];
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (indexToRemove) => {
    setImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    
    const cleanComment = sanitizeInput(comment);
    const cleanReviewerName = sanitizeInput(reviewerName);
    
    if (cleanComment.trim() === "") {
      alert("Please write a comment");
      return;
    }
    
    if (cleanReviewerName.trim() === "") {
      alert("Please enter your name");
      return;
    }

    // Content moderation
    if (!moderateContent(cleanComment) || !moderateContent(cleanReviewerName)) {
      alert("Please review your content and remove any inappropriate language.");
      return;
    }

    setSubmitting(true);
    try {
      // Upload any selected images first
      let imageUrls = [...images];
      if (selectedFiles.length > 0) {
        const newImageUrls = await uploadImages();
        imageUrls = [...imageUrls, ...newImageUrls];
      }

      // Create review data object
      const reviewData = {
        reviewerName: cleanReviewerName.slice(0, 100), // Limit name length
        comment: cleanComment.slice(0, 2000), // Limit comment length
        images: imageUrls.slice(0, 5) // Limit to 5 images max
      };

      console.log('Submitting review:', reviewData);

      // Use the review service to add the review
      const success = await addReview(restaurantId, reviewData, userIP);

      if (!success) {
        alert("Error submitting review. Please try again.");
        return;
      }

      // Success - reset form
      setSuccessMsg("Thanks for your review!");
      setComment("");
      setReviewerName("");
      setRating(5);
      setImages([]);
      setSelectedFiles([]);

      // Auto-clear success message
      setTimeout(() => {
        setSuccessMsg("");
      }, 5000);

    } catch (error) {
      console.error('Error submitting review:', error);
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
          Your Name:
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
            placeholder="Enter your name (max 100 characters)"
            required
          />
        </label>
      </div>

      {/* Comment */}
      <div style={{ marginBottom: 15 }}>
        <label>
          Comment:
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
            placeholder="Share your experience... (max 2000 characters)"
            required
          />
          <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
            {comment.length}/2000 characters
          </div>
        </label>
      </div>

      {/* Image Upload */}
      <div style={{ marginBottom: 15 }}>
        <label>Add Photos (Optional - Max 5):</label>
        
        {/* Debug Info */}
        <div style={{ fontSize: 12, color: '#666', marginBottom: 5 }}>
          Cloud: {process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || 'Not set'} | 
          Preset: {process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || 'Not set'}
        </div>
        
        {/* File Input */}
        <div style={{ marginTop: 5, marginBottom: 10 }}>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            disabled={submitting || uploadingImages || images.length >= 5}
            style={{ marginBottom: 5 }}
          />
          
          {selectedFiles.length > 0 && (
            <div>
              <p style={{ margin: '5px 0', fontSize: 14, color: '#666' }}>
                Selected: {selectedFiles.length} file(s)
              </p>
              <button
                type="button"
                onClick={uploadImages}
                disabled={uploadingImages}
                style={{
                  padding: '5px 10px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
              >
                {uploadingImages ? 'Uploading...' : 'Upload Photos'}
              </button>
            </div>
          )}
        </div>

        {/* Uploaded Images Preview */}
        {images.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10, marginTop: 10 }}>
            {images.map((imageUrl, index) => (
              <div key={index} style={{ position: 'relative' }}>
                <img
                  src={imageUrl}
                  alt={`Preview ${index + 1}`}
                  style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 4 }}
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  style={{
                    position: 'absolute',
                    top: -5,
                    right: -5,
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: 20,
                    height: 20,
                    cursor: 'pointer',
                    fontSize: 12
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit Button */}
      <button 
        type="submit" 
        disabled={submitting || uploadingImages}
        style={{
          padding: '10px 20px',
          backgroundColor: submitting || uploadingImages ? '#ccc' : '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          cursor: submitting || uploadingImages ? 'not-allowed' : 'pointer',
          fontSize: 16
        }}
      >
        {submitting ? "Submitting..." : uploadingImages ? "Uploading Images..." : "Submit Review"}
      </button>
      
      {successMsg && <p style={{ color: "green", marginTop: 10 }}>{successMsg}</p>}
    </form>
  );
}