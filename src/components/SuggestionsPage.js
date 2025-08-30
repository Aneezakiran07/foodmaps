// FIXED SuggestionsPage.js - Proper likes/dislikes handling
// src/components/SuggestionsPage.js

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiThumbsUp, FiThumbsDown, FiImage, FiX, FiMessageCircle, FiMaximize2, FiSearch } from 'react-icons/fi';
import SupabaseSuggestions from '../utils/supabaseSuggestions';
import CloudinaryService from '../utils/cloudinaryService';

const SuggestionsPage = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'suggestion',
    restaurantName: '',
    foodItem: '',
    images: []
  });
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedImage, setSelectedImage] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentImages, setCurrentImages] = useState([]);
  const [imageError, setImageError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [reactionLoading, setReactionLoading] = useState(new Set());

  // Debug suggestions state changes
  useEffect(() => {
    console.log('Suggestions state changed:', suggestions.map(s => ({
      id: s.id.substring(0, 8),
      title: s.title.substring(0, 20),
      likes: s.likes,
      dislikes: s.dislikes,
      userReaction: s.userReaction
    })));
  }, [suggestions]);

  // Helper function to highlight search terms
  const highlightSearchTerm = (text, searchTerm) => {
    if (!searchTerm || !text) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-yellow-900 px-1 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // FIXED: Simplified loadSuggestions - removed problematic early return
  const loadSuggestions = useCallback(async () => {
    setLoading(true);
    try {
      console.log('Loading suggestions:', { currentPage, filter, searchQuery });
      const result = await SupabaseSuggestions.getSuggestionsWithUserReactions(
        currentPage, 
        10, 
        filter, 
        searchQuery
      );
      if (result.success) {
        console.log('Loaded suggestions with counts:', result.suggestions.map(s => ({
          id: s.id,
          title: s.title.substring(0, 30),
          likes: s.likes,
          dislikes: s.dislikes,
          userReaction: s.userReaction
        })));
        setSuggestions(result.suggestions);
        setTotalPages(result.totalPages);
      } else {
        console.error('Error loading suggestions:', result.error);
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Error loading suggestions:', error);
      setSuggestions([]);
    }
    setLoading(false);
  }, [currentPage, filter, searchQuery]);

  // Load when page, filter, or search changes
  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    if (formData.images.length > 0) {
      const validation = CloudinaryService.validateMultipleImages(formData.images);
      if (!validation.valid) {
        alert(validation.error);
        return;
      }
    }

    setUploading(true);
    setImageError(null);

    try {
      const result = await SupabaseSuggestions.addSuggestion(formData);
      
      if (result.success) {
        setFormData({
          title: '',
          content: '',
          type: 'suggestion',
          restaurantName: '',
          foodItem: '',
          images: []
        });
        setShowForm(false);
        
        // Reload to get the new suggestion
        await loadSuggestions();
        
        alert('Your experience has been shared successfully!');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error submitting suggestion:', error);
      setImageError(error.message);
      alert('Failed to submit suggestion. Please try again.');
    }
    setUploading(false);
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    
    for (const file of files) {
      const validation = CloudinaryService.validateImage(file);
      if (!validation.valid) {
        alert(validation.error);
        return;
      }
    }

    if (formData.images.length + files.length > 5) {
      alert('You can upload maximum 5 images per post');
      return;
    }

    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...files]
    }));
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  // FIXED: Improved reaction handling with better error recovery
  const handleReaction = async (suggestionId, reactionType) => {
    // Prevent multiple simultaneous reactions on the same suggestion
    if (reactionLoading.has(suggestionId)) {
      console.log('Reaction already in progress for suggestion:', suggestionId);
      return;
    }

    try {
      console.log(`User clicked ${reactionType} for suggestion ${suggestionId}`);
      
      // Add to loading set
      setReactionLoading(prev => new Set([...prev, suggestionId]));
      
      // Find the current suggestion
      const currentSuggestion = suggestions.find(s => s.id === suggestionId);
      if (!currentSuggestion) {
        console.error('Suggestion not found in state');
        return;
      }

      // Store original state for potential rollback
      const originalSuggestion = { ...currentSuggestion };
      
      // Calculate what the new reaction state should be
      const isCurrentReaction = currentSuggestion.userReaction === reactionType;
      const newUserReaction = isCurrentReaction ? null : reactionType;
      
      // Calculate new counts based on reaction change
      let newLikes = Number(currentSuggestion.likes) || 0;
      let newDislikes = Number(currentSuggestion.dislikes) || 0;
      
      // Remove old reaction count
      if (currentSuggestion.userReaction === 'like') newLikes = Math.max(0, newLikes - 1);
      if (currentSuggestion.userReaction === 'dislike') newDislikes = Math.max(0, newDislikes - 1);
      
      // Add new reaction count
      if (newUserReaction === 'like') newLikes++;
      if (newUserReaction === 'dislike') newDislikes++;

      // Optimistically update the UI FIRST
      setSuggestions(prevSuggestions => 
        prevSuggestions.map(suggestion => {
          if (suggestion.id === suggestionId) {
            return {
              ...suggestion,
              userReaction: newUserReaction,
              likes: newLikes,
              dislikes: newDislikes
            };
          }
          return suggestion;
        })
      );
      
      console.log('Optimistic update applied:', {
        suggestionId: suggestionId.substring(0, 8),
        newUserReaction,
        newLikes,
        newDislikes
      });
      
      // Now send to server and wait for response
      const result = await SupabaseSuggestions.toggleReaction(suggestionId, reactionType);
      
      if (result.success) {
        console.log('Server reaction successful:', result);
        
        // Use server counts if available, otherwise keep optimistic update
        const serverLikes = result.updatedCounts ? result.updatedCounts.likes : result.manualCounts.likes;
        const serverDislikes = result.updatedCounts ? result.updatedCounts.dislikes : result.manualCounts.dislikes;
        
        if (serverLikes !== newLikes || serverDislikes !== newDislikes) {
          console.log('Server counts differ from optimistic, updating:', {
            optimistic: { likes: newLikes, dislikes: newDislikes },
            server: { likes: serverLikes, dislikes: serverDislikes }
          });
          
          setSuggestions(prevSuggestions => 
            prevSuggestions.map(suggestion => {
              if (suggestion.id === suggestionId) {
                return {
                  ...suggestion,
                  userReaction: result.reactionType,
                  likes: Number(serverLikes) || 0,
                  dislikes: Number(serverDislikes) || 0
                };
              }
              return suggestion;
            })
          );
        } else {
          console.log('Optimistic update matches server, keeping current state');
        }
      } else {
        console.error('Server reaction failed, reverting:', result.error);
        
        // Revert to original state
        setSuggestions(prevSuggestions => 
          prevSuggestions.map(suggestion => {
            if (suggestion.id === suggestionId) {
              return originalSuggestion;
            }
            return suggestion;
          })
        );
        
        alert(`Failed to ${reactionType} post: ${result.error}`);
      }
        
    } catch (error) {
      console.error('Error in handleReaction:', error);
      
      // On any error, reload from server to get fresh state
      console.log('Reloading suggestions due to error');
      await loadSuggestions();
      
      alert('Something went wrong. Please try again.');
    } finally {
      // Remove from loading set
      setReactionLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(suggestionId);
        return newSet;
      });
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const openImageModal = (imageUrl, allImages = [imageUrl], index = 0) => {
    console.log('Opening image modal:', imageUrl, 'Index:', index);
    setSelectedImage(imageUrl);
    setCurrentImages(allImages);
    setCurrentImageIndex(index);
  };

  const closeImageModal = () => {
    console.log('Closing image modal');
    setSelectedImage(null);
    setCurrentImages([]);
    setCurrentImageIndex(0);
  };

  // Handle keyboard events for image modal
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!selectedImage) return;

      if (event.key === 'Escape') {
        closeImageModal();
      } else if (event.key === 'ArrowLeft' && currentImages.length > 1) {
        const prevIndex = currentImageIndex > 0 ? currentImageIndex - 1 : currentImages.length - 1;
        setCurrentImageIndex(prevIndex);
        setSelectedImage(currentImages[prevIndex]);
      } else if (event.key === 'ArrowRight' && currentImages.length > 1) {
        const nextIndex = currentImageIndex < currentImages.length - 1 ? currentImageIndex + 1 : 0;
        setCurrentImageIndex(nextIndex);
        setSelectedImage(currentImages[nextIndex]);
      }
    };

    if (selectedImage) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [selectedImage, currentImageIndex, currentImages]);

  return (
    <div className="min-h-screen bg-gray-50 pt-28 pb-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Food Community Hub
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Share your food experiences, suggestions, and feedback with the community
          </p>
          
          <div className="flex justify-center gap-4 mb-4">
            <button
              onClick={() => setShowForm(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-colors"
            >
              <FiPlus />
              Share Your Experience
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="max-w-md mx-auto mb-6">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search posts... (restaurant, food, content)"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            {searchInput && (
              <button
                onClick={() => {
                  setSearchInput('');
                  setSearchQuery('');
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <FiX size={16} />
              </button>
            )}
          </div>
        </div>
        
        <div className="flex justify-center mb-6">
          <div className="bg-white rounded-lg p-1 shadow-sm">
            {[
              { key: 'all', label: 'All Posts', icon: '' },
              { key: 'suggestion', label: 'Suggestions', icon: '' },
              { key: 'complaint', label: 'Complaints', icon: '' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setFilter(tab.key);
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filter === tab.key
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Suggestions List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm">
              <FiMessageCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery ? 'No posts found' : 'No posts yet'}
              </h3>
              <p className="text-gray-600">
                {searchQuery 
                  ? `Try searching with different keywords or check the spelling` 
                  : 'Be the first to share your food experience!'
                }
              </p>
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchInput('');
                    setSearchQuery('');
                  }}
                  className="mt-3 text-orange-600 hover:text-orange-700 text-sm font-medium"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            suggestions.map((suggestion) => (
              <motion.div
                key={suggestion.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow-sm p-6"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      suggestion.type === 'suggestion' ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {highlightSearchTerm(suggestion.title, searchQuery)}
                      </h3>
                      <p className="text-sm text-gray-500">{formatDate(suggestion.created_at)}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    suggestion.type === 'suggestion' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {suggestion.type === 'suggestion' ? 'Suggestion' : 'Complaint'}
                  </span>
                </div>

                {/* Restaurant & Food Info */}
                {(suggestion.restaurant_name || suggestion.food_item) && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    {suggestion.restaurant_name && (
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Restaurant:</span> {highlightSearchTerm(suggestion.restaurant_name, searchQuery)}
                      </p>
                    )}
                    {suggestion.food_item && (
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Food Item:</span> {highlightSearchTerm(suggestion.food_item, searchQuery)}
                      </p>
                    )}
                  </div>
                )}

                {/* Content */}
                <div className="text-gray-700 mb-4 whitespace-pre-wrap">
                  {highlightSearchTerm(suggestion.content, searchQuery)}
                </div>

                {/* Images */}
                {suggestion.images && suggestion.images.length > 0 && (
                  <div className="mb-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {suggestion.images.map((image, index) => (
                        <div 
                          key={index} 
                          className="relative group cursor-pointer rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('Image clicked:', image, 'Index:', index);
                            openImageModal(image, suggestion.images, index);
                          }}
                        >
                          <img
                            src={image}
                            alt={`Food image ${index + 1}`}
                            className="w-full h-32 object-cover transition-transform duration-200 group-hover:scale-110"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white bg-opacity-90 rounded-full p-2">
                              <FiMaximize2 className="text-gray-800" size={18} />
                            </div>
                          </div>
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <div className="bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded-full">
                              Click to enlarge
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* FIXED: Reactions with proper loading state */}
                <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => handleReaction(suggestion.id, 'like')}
                    disabled={reactionLoading.has(suggestion.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                      suggestion.userReaction === 'like'
                        ? 'bg-green-100 text-green-700 border border-green-300'
                        : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
                    } ${reactionLoading.has(suggestion.id) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <FiThumbsUp className={`${suggestion.userReaction === 'like' ? 'fill-current' : ''}`} size={16} />
                    <span className="font-medium">{suggestion.likes || 0}</span>
                  </button>
                  
                  <button
                    onClick={() => handleReaction(suggestion.id, 'dislike')}
                    disabled={reactionLoading.has(suggestion.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                      suggestion.userReaction === 'dislike'
                        ? 'bg-red-100 text-red-700 border border-red-300'
                        : 'text-gray-600 hover:text-red-600 hover:bg-red-50'
                    } ${reactionLoading.has(suggestion.id) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <FiThumbsDown className={`${suggestion.userReaction === 'dislike' ? 'fill-current' : ''}`} size={16} />
                    <span className="font-medium">{suggestion.dislikes || 0}</span>
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-8">
            <div className="flex gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    currentPage === page
                      ? 'bg-orange-500 text-white'
                      : 'bg-white text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Image Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50"
            onClick={closeImageModal}
            style={{ padding: '20px' }}
          >
            <button
              onClick={closeImageModal}
              className="absolute top-6 right-6 z-20 bg-black bg-opacity-70 text-white rounded-full p-3 hover:bg-opacity-90 transition-all duration-200 backdrop-blur-sm border border-gray-600"
              aria-label="Close image"
            >
              <FiX size={24} />
            </button>

            {currentImages.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const prevIndex = currentImageIndex > 0 ? currentImageIndex - 1 : currentImages.length - 1;
                    setCurrentImageIndex(prevIndex);
                    setSelectedImage(currentImages[prevIndex]);
                  }}
                  className="absolute left-6 top-1/2 transform -translate-y-1/2 z-20 bg-black bg-opacity-70 text-white rounded-full p-3 hover:bg-opacity-90 transition-all duration-200 backdrop-blur-sm border border-gray-600"
                  aria-label="Previous image"
                >
                  <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextIndex = currentImageIndex < currentImages.length - 1 ? currentImageIndex + 1 : 0;
                    setCurrentImageIndex(nextIndex);
                    setSelectedImage(currentImages[nextIndex]);
                  }}
                  className="absolute right-6 top-1/2 transform -translate-y-1/2 z-20 bg-black bg-opacity-70 text-white rounded-full p-3 hover:bg-opacity-90 transition-all duration-200 backdrop-blur-sm border border-gray-600"
                  aria-label="Next image"
                >
                  <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            <motion.div
              key={selectedImage}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative flex items-center justify-center w-full h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedImage}
                alt={`Food image ${currentImageIndex + 1} of ${currentImages.length}`}
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                style={{
                  maxWidth: 'calc(100vw - 120px)',
                  maxHeight: 'calc(100vh - 80px)',
                  width: 'auto',
                  height: 'auto',
                  display: 'block'
                }}
                onLoad={(e) => {
                  console.log('Image loaded successfully:', e.target.naturalWidth, 'x', e.target.naturalHeight);
                }}
                onError={(e) => {
                  console.error('Error loading image:', selectedImage);
                }}
              />
            </motion.div>

            {currentImages.length > 1 && (
              <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-10">
                <div className="bg-black bg-opacity-70 text-white text-sm px-3 py-1 rounded-full backdrop-blur-sm border border-gray-600">
                  {currentImageIndex + 1} / {currentImages.length}
                </div>
              </div>
            )}

            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10">
              <div className="bg-black bg-opacity-60 text-white text-sm px-4 py-2 rounded-full backdrop-blur-sm border border-gray-600">
                {currentImages.length > 1 ? 'Use arrow keys or buttons to navigate • ' : ''}Click outside or press ESC to close
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Suggestion Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Share Your Experience</h2>
                  <button
                    onClick={() => setShowForm(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FiX size={24} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Type Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type of Post
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="type"
                          value="suggestion"
                          checked={formData.type === 'suggestion'}
                          onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                          className="mr-2"
                        />
                        Suggestion
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="type"
                          value="complaint"
                          checked={formData.type === 'complaint'}
                          onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                          className="mr-2"
                        />
                        Complaint
                      </label>
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Brief title for your post..."
                      required
                      maxLength={255}
                    />
                  </div>

                  {/* Restaurant Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Restaurant Name (optional)
                    </label>
                    <input
                      type="text"
                      value={formData.restaurantName}
                      onChange={(e) => setFormData(prev => ({ ...prev, restaurantName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Which restaurant?"
                      maxLength={255}
                    />
                  </div>

                  {/* Food Item */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Food Item (optional)
                    </label>
                    <input
                      type="text"
                      value={formData.foodItem}
                      onChange={(e) => setFormData(prev => ({ ...prev, foodItem: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="What food item?"
                      maxLength={255}
                    />
                  </div>

                  {/* Content */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Experience *
                    </label>
                    <textarea
                      value={formData.content}
                      onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Share your detailed experience, suggestions, or feedback..."
                      required
                      maxLength={2000}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.content.length}/2000 characters
                    </p>
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Add Photos (optional, max 5 images)
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                      <input
                        type="file"
                        multiple
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="image-upload"
                        disabled={formData.images.length >= 5}
                      />
                      <label 
                        htmlFor="image-upload" 
                        className={`cursor-pointer ${formData.images.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <FiImage className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">
                          {formData.images.length >= 5 
                            ? 'Maximum 5 images reached' 
                            : 'Click to upload images (JPEG, PNG, WebP - Max 5MB each)'
                          }
                        </p>
                      </label>
                    </div>
                    
                    {/* Preview Images */}
                    {formData.images.length > 0 && (
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        {formData.images.map((file, index) => (
                          <div key={index} className="relative">
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                            >
                              <FiX />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {imageError && (
                      <p className="text-red-600 text-sm mt-2">{imageError}</p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                      disabled={uploading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={uploading || !formData.title.trim() || !formData.content.trim()}
                      className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploading ? 'Posting...' : 'Post Experience'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SuggestionsPage;