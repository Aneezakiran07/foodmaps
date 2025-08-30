import React, { useState, useEffect } from 'react';
import { FiUser, FiEdit3, FiTrash2, FiX, FiPlus, FiImage, FiUpload } from 'react-icons/fi';
import { SupabaseReviews } from '../utils/supabaseReviews';
import CloudinaryService from '../utils/cloudinaryService.js';

// Image Zoom Modal Component
const ImageZoomModal = ({ src, alt, isOpen, onClose }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (isOpen && src) {
      setImageLoaded(false);
      setImageDimensions({ width: 0, height: 0 });
    }
  }, [isOpen, src]);

  const handleImageLoad = (e) => {
    const img = e.target;
    const maxWidth = window.innerWidth * 0.9;
    const maxHeight = window.innerHeight * 0.9;
    
    let { naturalWidth, naturalHeight } = img;
    
    const scaleWidth = maxWidth / naturalWidth;
    const scaleHeight = maxHeight / naturalHeight;
    const scale = Math.min(scaleWidth, scaleHeight, 1);
    
    setImageDimensions({
      width: naturalWidth * scale,
      height: naturalHeight * scale
    });
    setImageLoaded(true);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Image zoom view"
    >
      <div className="relative max-w-full max-h-full">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-2 transition-all duration-200 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Close image"
        >
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {!imageLoaded && (
          <div className="flex items-center justify-center w-64 h-64" role="status" aria-label="Loading image">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        )}

        <img
          src={src}
          alt={alt || "Zoomed image"}
          className={`rounded-lg shadow-2xl transition-opacity duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            width: imageDimensions.width ? `${imageDimensions.width}px` : 'auto',
            height: imageDimensions.height ? `${imageDimensions.height}px` : 'auto',
            maxWidth: '90vw',
            maxHeight: '90vh',
            objectFit: 'contain'
          }}
          onLoad={handleImageLoad}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
};

const ReviewComponent = ({ restaurantId, restaurantName }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [userIP, setUserIP] = useState('anonymous');
  const [hasReviewed, setHasReviewed] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Image zoom modal state
  const [selectedImage, setSelectedImage] = useState(null);
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);
  const [hasReviewedToday, setHasReviewedToday] = useState(false);
  const [userTodayReview, setUserTodayReview] = useState(null);
  const [showDailyLimitModal, setShowDailyLimitModal] = useState(false);

  // Form state
  const [reviewerName, setReviewerName] = useState('');
  const [comment, setComment] = useState('');
  const [images, setImages] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [editingReview, setEditingReview] = useState(null);

  // Input sanitization
  const sanitizeInput = (input) => {
    if (typeof input !== 'string') return '';
    return input.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').slice(0, 1000);
  };

  // Rate limiting check for reviews
  const checkReviewRateLimit = async (ip) => {
    try {
      const today = new Date().toDateString();
      const reviewsToday = JSON.parse(localStorage.getItem(`reviews_${ip}_${today}`) || '[]');
      
      if (reviewsToday.length >= 5) { // Max 5 reviews per day per IP
        return { allowed: false, message: 'Daily review limit reached. You can submit up to 5 reviews per day.' };
      }
      
      return { allowed: true };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      return { allowed: true };
    }
  };

  // Image URL validation
  const validateImageUrl = (url) => {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'https:' && (
        urlObj.hostname.includes('cloudinary.com') || 
        urlObj.hostname.includes('res.cloudinary.com')
      );
    } catch {
      return false;
    }
  };

  useEffect(() => {
    if (restaurantId) {
      loadReviews();
    }
  }, [restaurantId]);

  // Helper function to check if date is today
  const isToday = (dateString) => {
    const today = new Date();
    const date = new Date(dateString);
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const loadReviews = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      
      // Get user's IP
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipResponse.json();
      const sanitizedIP = ipData.ip.replace(/[^0-9.]/g, '');
      setUserIP(sanitizedIP);

      // Get all reviews for restaurant
      const reviewsData = await SupabaseReviews.getRestaurantReviews(restaurantId);
      
      // Validate and sanitize review data
      const sanitizedReviews = reviewsData.map(review => ({
        ...review,
        reviewer_name: sanitizeInput(review.reviewer_name),
        comment: sanitizeInput(review.comment),
        images: Array.isArray(review.images) ? review.images.filter(validateImageUrl) : []
      }));
      
      setReviews(sanitizedReviews);

      // Check if user has already reviewed
      const userHasReviewed = await SupabaseReviews.hasUserReviewed(restaurantId, sanitizedIP);
      setHasReviewed(userHasReviewed);
      
      const userReviewsToday = sanitizedReviews.filter(review => 
        review.user_ip === sanitizedIP && isToday(review.created_at)
      );

      if (userReviewsToday.length > 0) {
        setHasReviewedToday(true);
        setUserTodayReview(userReviewsToday[0]);
      } else {
        setHasReviewedToday(false);
        setUserTodayReview(null);
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
      setErrorMessage('Failed to load reviews. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageClick = (imageUrl, altText) => {
    if (validateImageUrl(imageUrl)) {
      setSelectedImage({ src: imageUrl, alt: altText });
      setIsZoomModalOpen(true);
    }
  };

  const closeZoomModal = () => {
    setIsZoomModalOpen(false);
    setSelectedImage(null);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    
    // Validate files
    const validation = CloudinaryService.validateMultipleImages(files);
    if (!validation.valid) {
      setErrorMessage(validation.error);
      e.target.value = '';
      return;
    }

    setSelectedFiles(files);
    setErrorMessage('');
  };

  const uploadImages = async () => {
    if (selectedFiles.length === 0) return [];

    setUploadingImages(true);
    setErrorMessage('');
    
    try {
      const result = await CloudinaryService.uploadMultipleImages(selectedFiles);
      
      if (result.success) {
        const validUrls = result.uploadedImages.filter(validateImageUrl);
        setImages(prev => [...prev, ...validUrls]);
        setSelectedFiles([]);
        return validUrls;
      } else {
        const errorMsg = `Failed to upload ${result.failedUploads} out of ${result.totalUploads} images`;
        setErrorMessage(errorMsg);
        return [];
      }
    } catch (error) {
      console.error('Upload error:', error);
      setErrorMessage('Upload failed. Please try again.');
      return [];
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (indexToRemove) => {
    setImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    
    const sanitizedName = sanitizeInput(reviewerName);
    const sanitizedComment = sanitizeInput(comment);
    
    if (!sanitizedName || !sanitizedComment) {
      setErrorMessage('Please fill in all required fields');
      return;
    }

    if (sanitizedName.length < 2 || sanitizedComment.length < 10) {
      setErrorMessage('Name must be at least 2 characters and review at least 10 characters');
      return;
    }

    // Check rate limiting for new reviews
    if (!editingReview) {
      const rateLimitCheck = await checkReviewRateLimit(userIP);
      if (!rateLimitCheck.allowed) {
        setErrorMessage(rateLimitCheck.message);
        return;
      }

      if (hasReviewedToday) {
        setShowDailyLimitModal(true);
        return;
      }
    }

    setSubmitting(true);
    setErrorMessage('');
    
    try {
      // Upload any remaining selected files
      let finalImageUrls = [...images];
      if (selectedFiles.length > 0) {
        const newUrls = await uploadImages();
        finalImageUrls = [...finalImageUrls, ...newUrls];
      }

      // Validate all image URLs
      finalImageUrls = finalImageUrls.filter(validateImageUrl);

      const reviewData = {
        reviewerName: sanitizedName,
        comment: sanitizedComment,
        images: finalImageUrls
      };

      let success;
      if (editingReview) {
        success = await SupabaseReviews.updateReview(restaurantId, reviewData, userIP);
      } else {
        success = await SupabaseReviews.addReview(restaurantId, reviewData, userIP);
        
        // Update rate limiting storage
        if (success) {
          const today = new Date().toDateString();
          const existing = JSON.parse(localStorage.getItem(`reviews_${userIP}_${today}`) || '[]');
          existing.push({ timestamp: Date.now(), restaurantId });
          localStorage.setItem(`reviews_${userIP}_${today}`, JSON.stringify(existing));
        }
      }

      if (success) {
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
        setShowAddModal(false);
        setShowEditModal(false);
        resetForm();
        loadReviews();
      } else {
        setErrorMessage('Failed to submit review. Please try again.');
      }
    } catch (error) {
      console.error('Submit error:', error);
      setErrorMessage('Failed to submit review. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddReviewClick = () => {
    if (hasReviewedToday) {
      setShowDailyLimitModal(true);
    } else {
      setShowAddModal(true);
      setErrorMessage('');
    }
  };

  const handleEditReview = (review) => {
    setEditingReview(review);
    setReviewerName(review.reviewer_name);
    setComment(review.comment);
    setImages(Array.isArray(review.images) ? review.images.filter(validateImageUrl) : []);
    setSelectedFiles([]);
    setErrorMessage('');
    setShowEditModal(true);
  };

  const handleDeleteReview = async () => {
    if (!window.confirm('Are you sure you want to delete your review?')) {
      return;
    }

    try {
      const success = await SupabaseReviews.deleteReview(restaurantId, userIP);
      if (success) {
        loadReviews();
      } else {
        setErrorMessage('Failed to delete review');
      }
    } catch (error) {
      console.error('Delete error:', error);
      setErrorMessage('Failed to delete review');
    }
  };

  const resetForm = () => {
    setReviewerName('');
    setComment('');
    setImages([]);
    setSelectedFiles([]);
    setEditingReview(null);
    setErrorMessage('');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border" role="status" aria-label="Loading reviews">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading reviews...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            Customer Reviews ({reviews.length})
          </h2>
          
          <button
            onClick={handleAddReviewClick}
            className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition flex items-center gap-2"
            aria-label="Add a review"
          >
            <FiPlus className="w-4 h-4" />
            Add Review
          </button>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4" role="alert">
            <p className="font-medium">{errorMessage}</p>
          </div>
        )}

        {/* Success Message */}
        {showSuccessMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-4" role="alert">
            <p className="font-medium">Review submitted successfully!</p>
          </div>
        )}

        {/* Reviews List */}
        <div className="space-y-4">
          {reviews.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No reviews yet. Be the first to review {restaurantName}!</p>
            </div>
          ) : (
            reviews.map((review) => (
              <div key={review.review_id || review.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-orange-500 text-white rounded-full p-2">
                      <FiUser className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {review.reviewer_name}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {formatDate(review.created_at)}
                        {review.updated_at !== review.created_at && ' (edited)'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Show edit/delete buttons for user's own review */}
                  {review.user_ip === userIP && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditReview(review)}
                        className="text-blue-600 hover:text-blue-800 p-1 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                        title="Edit review"
                        aria-label="Edit this review"
                      >
                        <FiEdit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleDeleteReview}
                        className="text-red-600 hover:text-red-800 p-1 focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
                        title="Delete review"
                        aria-label="Delete this review"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                
                <p className="text-gray-700 ml-11 mb-3">{review.comment}</p>
                
                {/* Review Images with Zoom Functionality */}
                {review.images && review.images.length > 0 && (
                  <div className="ml-11">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {review.images.map((imageUrl, index) => (
                        <div
                          key={index}
                          className="relative group cursor-pointer transform transition-all duration-300 hover:scale-105"
                          onClick={() => handleImageClick(imageUrl, `Review image ${index + 1}`)}
                        >
                          <img
                            src={imageUrl}
                            alt={`Review image ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 rounded-lg flex items-center justify-center">
                            <div className="bg-white bg-opacity-90 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Image Zoom Modal */}
      <ImageZoomModal
        src={selectedImage?.src}
        alt={selectedImage?.alt}
        isOpen={isZoomModalOpen}
        onClose={closeZoomModal}
      />

      {/* Daily Limit Modal */}
      {showDailyLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" role="dialog" aria-modal="true">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
                <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Daily Review Limit Reached
              </h3>
              <p className="text-gray-600 mb-6">
                You can only submit one review per day. Come back tomorrow or edit your current review.
              </p>
              
              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => setShowDailyLimitModal(false)}
                  className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 transition"
                >
                  Cancel
                </button>
                {userTodayReview && (
                  <button
                    onClick={() => {
                      setShowDailyLimitModal(false);
                      handleEditReview(userTodayReview);
                    }}
                    className="bg-orange-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
                  >
                    Edit Current Review
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Review Modal */}
      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50" role="dialog" aria-modal="true">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Add Review for {restaurantName}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 rounded"
                aria-label="Close modal"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              {errorMessage && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm" role="alert">
                  {errorMessage}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name *
                </label>
                <input
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter your name"
                  required
                  maxLength={100}
                  aria-describedby="name-help"
                />
                <p id="name-help" className="text-xs text-gray-500 mt-1">Minimum 2 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Review *
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Share your experience..."
                  required
                  maxLength={1000}
                  aria-describedby="review-help"
                />
                <p id="review-help" className="text-xs text-gray-500 mt-1">Minimum 10 characters</p>
              </div>

              {/* Image Upload Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add Photos (Optional - Max 5)
                </label>
                
                {/* File Input */}
                <div className="mb-3">
                  <input
                    type="file"
                    id="imageUpload"
                    multiple
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <label
                    htmlFor="imageUpload"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 focus-within:ring-2 focus-within:ring-orange-500 transition"
                  >
                    <FiImage className="w-4 h-4 mr-2" />
                    Choose Photos
                  </label>
                  {selectedFiles.length > 0 && (
                    <span className="ml-2 text-sm text-gray-600">
                      {selectedFiles.length} file(s) selected
                    </span>
                  )}
                </div>

                {/* Upload Button */}
                {selectedFiles.length > 0 && (
                  <div className="mb-3">
                    <button
                      type="button"
                      onClick={uploadImages}
                      disabled={uploadingImages}
                      className="inline-flex items-center px-3 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    >
                      <FiUpload className="w-4 h-4 mr-2" />
                      {uploadingImages ? 'Uploading...' : 'Upload Photos'}
                    </button>
                  </div>
                )}

                {/* Uploaded Images Preview */}
                {images.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Uploaded images:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {images.map((imageUrl, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={imageUrl}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-16 object-cover rounded border cursor-pointer hover:opacity-80 transition"
                            onClick={() => handleImageClick(imageUrl, `Preview ${index + 1}`)}
                            loading="lazy"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeImage(index);
                            }}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                            aria-label="Remove image"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploadingImages}
                  className="bg-orange-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-orange-600 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
                >
                  {submitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Review Modal */}
      {showEditModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50" role="dialog" aria-modal="true">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Edit Review for {restaurantName}
              </h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 rounded"
                aria-label="Close modal"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              {errorMessage && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm" role="alert">
                  {errorMessage}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name *
                </label>
                <input
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter your name"
                  required
                  maxLength={100}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Review *
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Share your experience..."
                  required
                  maxLength={1000}
                />
              </div>
              
              {/* Image Upload Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add Photos (Optional - Max 5)
                </label>
                
                {/* File Input */}
                <div className="mb-3">
                  <input
                    type="file"
                    id="imageUploadEdit"
                    multiple
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <label
                    htmlFor="imageUploadEdit"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 focus-within:ring-2 focus-within:ring-orange-500 transition"
                  >
                    <FiImage className="w-4 h-4 mr-2" />
                    Choose Photos
                  </label>
                  {selectedFiles.length > 0 && (
                    <span className="ml-2 text-sm text-gray-600">
                      {selectedFiles.length} file(s) selected
                    </span>
                  )}
                </div>

                {/* Upload Button */}
                {selectedFiles.length > 0 && (
                  <div className="mb-3">
                    <button
                      type="button"
                      onClick={uploadImages}
                      disabled={uploadingImages}
                      className="inline-flex items-center px-3 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    >
                      <FiUpload className="w-4 h-4 mr-2" />
                      {uploadingImages ? 'Uploading...' : 'Upload Photos'}
                    </button>
                  </div>
                )}

                {/* Uploaded Images Preview */}
                {images.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Uploaded images:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {images.map((imageUrl, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={imageUrl}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-16 object-cover rounded border cursor-pointer hover:opacity-80 transition"
                            onClick={() => handleImageClick(imageUrl, `Preview ${index + 1}`)}
                            loading="lazy"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeImage(index);
                            }}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                            aria-label="Remove image"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploadingImages}
                  className="bg-orange-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-orange-600 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
                >
                  {submitting ? 'Updating...' : 'Update Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ReviewComponent;