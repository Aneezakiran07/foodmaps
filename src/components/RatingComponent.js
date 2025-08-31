// Simple, clean rating display component for the header
import React, { useState, useEffect } from 'react';
import { FiStar, FiX } from 'react-icons/fi';
import { SupabaseRatings } from '../utils/supabaseRatingService.js';

const RatingComponent = ({ restaurantId, restaurantName }) => {
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [error, setError] = useState('');

  const getDeviceId = () => {
    const STORAGE_KEY = 'restaurant_app_device_id';
    let storedDeviceId = localStorage.getItem(STORAGE_KEY);
    if (!storedDeviceId) {
      storedDeviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem(STORAGE_KEY, storedDeviceId);
    }
    return storedDeviceId;
  };

  // FIXED: Simple star rendering function that works properly
  const renderDisplayStars = (rating, size = 'w-3 h-3') => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        // Full star
        stars.push(
          <FiStar key={i} className={`${size} text-yellow-400 fill-yellow-400`} />
        );
      } else if (i === fullStars + 1 && hasHalfStar) {
        // Half star
        stars.push(
          <div key={i} className={`relative ${size}`}>
            <FiStar className={`${size} text-gray-300 absolute`} />
            <div className="overflow-hidden absolute" style={{ width: '50%' }}>
              <FiStar className={`${size} text-yellow-400 fill-yellow-400`} />
            </div>
          </div>
        );
      } else {
        // Empty star
        stars.push(
          <FiStar key={i} className={`${size} text-gray-300`} />
        );
      }
    }
    
    return stars;
  };

  // Interactive stars for the modal - fixed size and position
  const renderInteractiveStars = () => {
    const stars = [];
    const currentRating = hoverRating || userRating;
    
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <div key={i} className="relative w-8 h-8 flex-shrink-0">
          {/* Left half clickable area (for .5 rating) */}
          <button
            onClick={() => handleRating(i - 0.5)}
            onMouseEnter={() => handleStarHover(i - 0.5)}
            onMouseLeave={handleStarLeave}
            disabled={submitting}
            className={`absolute left-0 top-0 w-1/2 h-full z-10 ${submitting ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            style={{ background: 'transparent' }}
          />
          
          {/* Right half clickable area (for full rating) */}
          <button
            onClick={() => handleRating(i)}
            onMouseEnter={() => handleStarHover(i)}
            onMouseLeave={handleStarLeave}
            disabled={submitting}
            className={`absolute right-0 top-0 w-1/2 h-full z-10 ${submitting ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            style={{ background: 'transparent' }}
          />
          
          {/* Visual star - fixed positioning */}
          <div className="absolute top-0 left-0 w-8 h-8">
            {/* Background star - always visible */}
            <FiStar className="w-8 h-8 text-gray-300 absolute top-0 left-0" />
            
            {/* Half fill overlay */}
            {currentRating >= i - 0.5 && currentRating < i && (
              <div className="absolute top-0 left-0 overflow-hidden w-1/2 h-full">
                <FiStar className="w-8 h-8 text-yellow-400 fill-yellow-400" />
              </div>
            )}
            
            {/* Full fill overlay */}
            {currentRating >= i && (
              <FiStar className="w-8 h-8 text-yellow-400 fill-yellow-400 absolute top-0 left-0" />
            )}
          </div>
        </div>
      );
    }
    
    return stars;
  };

  useEffect(() => {
    const loadRatings = async () => {
      if (!restaurantId) {
        setLoading(false);
        return;
      }

      try {
        setError('');
        
        // Get or generate device ID
        const currentDeviceId = getDeviceId();
        setDeviceId(currentDeviceId);

        // Get restaurant ratings
        const ratings = await SupabaseRatings.getRestaurantRatings(restaurantId);
        setAverageRating(ratings.average || 0);
        setTotalRatings(ratings.count || 0);

        // Check if user has already rated with this device
        const userHasRated = await SupabaseRatings.hasUserRated(restaurantId, currentDeviceId);
        if (userHasRated) {
          const existingRating = await SupabaseRatings.getUserRating(restaurantId, currentDeviceId);
          if (existingRating) {
            setUserRating(existingRating);
            setHasRated(true);
          }
        }
      } catch (error) {
        console.error('Error loading ratings:', error);
        setError('Failed to load ratings');
      } finally {
        setLoading(false);
      }
    };

    loadRatings();
  }, [restaurantId]);

  const handleRating = async (rating) => {
    if (submitting) return;
    
    setSubmitting(true);
    setError('');
    
    try {
      const result = await SupabaseRatings.addRating(restaurantId, rating, deviceId);
      
      if (result) {
        setUserRating(rating);
        setHasRated(true);
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
        setShowRatingModal(false);
        
        // Reload ratings to get updated average and count
        const updatedRatings = await SupabaseRatings.getRestaurantRatings(restaurantId);
        setAverageRating(updatedRatings.average || 0);
        setTotalRatings(updatedRatings.count || 0);
      } else {
        setError('Failed to submit rating. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      setError('Failed to submit rating. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStarHover = (rating) => {
    if (!submitting) {
      setHoverRating(rating);
    }
  };

  const handleStarLeave = () => {
    if (!submitting) {
      setHoverRating(0);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-3 rounded-lg shadow-sm border">
        <div className="text-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-1 text-xs text-gray-600">Loading ratings...</p>
        </div>
      </div>
    );
  }

  if (error && !showRatingModal) {
    return (
      <div className="bg-white p-3 rounded-lg shadow-sm border">
        <div className="text-center">
          <p className="text-xs text-red-600">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-1 text-xs text-orange-600 hover:text-orange-800"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Compact Rating Banner */}
      <div className="bg-white rounded-lg shadow-sm border p-3">
        <div className="flex items-center justify-between">
          {/* Left side: Stars and rating info */}
          <div className="flex items-center space-x-3">
            {/* 5 Stars Display - smaller */}
            <div className="flex items-center space-x-0.5">
              {renderDisplayStars(averageRating, 'w-3 h-3')}
            </div>
            
            {/* Rating Text - much smaller */}
            <div className="flex flex-col">
              <div className="flex items-baseline space-x-1">
                <span className="text-sm font-semibold text-gray-900">
                  {averageRating > 0 ? averageRating.toFixed(1) : '0.0'}
                </span>
                <span className="text-xs text-gray-500">out of 5</span>
              </div>
              <p className="text-xs text-gray-500">
                {totalRatings} rating{totalRatings !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          {/* Right side: Rate button - smaller */}
          <button
            onClick={() => setShowRatingModal(true)}
            className="bg-orange-500 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-orange-600 transition-colors duration-200"
            disabled={loading}
          >
            {hasRated ? 'Update Rating' : 'Rate This Place'}
          </button>
        </div>
        
        {/* Your Rating Status - smaller */}
        {hasRated && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <div className="flex items-center space-x-1">
              <span className="text-xs text-gray-600">Your rating:</span>
              <div className="flex items-center space-x-0.5">
                {renderDisplayStars(userRating, 'w-3 h-3')}
              </div>
              <span className="text-xs font-medium text-gray-800">
                {userRating.toFixed(1)} star{userRating !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}
        
        {error && (
          <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}
      </div>

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded-lg shadow-lg z-60">
          <div className="flex items-center space-x-2">
            <FiStar className="w-5 h-5 text-green-600" />
            <p className="font-medium text-sm">Rating submitted successfully!</p>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                Rate {restaurantName || 'Restaurant'}
              </h3>
              <button
                onClick={() => {
                  setShowRatingModal(false);
                  setError('');
                  setHoverRating(0);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={submitting}
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="text-center mb-8">
              {/* Interactive Stars */}
              <div className="flex items-center justify-center space-x-2 mb-4">
                {renderInteractiveStars()}
              </div>
              
              {/* Fixed Rating Value Display - Always show current rating */}
              <div className="mb-4 h-16">
                <p className="text-2xl font-bold text-gray-800 mb-1">
                  {(hoverRating || userRating || 0).toFixed(1)}
                </p>
                <p className="text-sm text-gray-600">
                  {(hoverRating || userRating || 0).toFixed(1)} star{(hoverRating || userRating || 0) !== 1 ? 's' : ''}
                </p>
              </div>
              
              {/* Fixed Status Messages - Always same height */}
              <div className="mb-4 h-16">
                {hasRated && !submitting && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700">
                      You previously rated this restaurant {userRating.toFixed(1)} star{userRating !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}
                
                {submitting && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <p className="text-sm text-blue-700">Submitting your rating...</p>
                    </div>
                  </div>
                )}
                
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}
              </div>
              
              <p className="text-xs text-gray-500">
                Click on the left half of a star for .5 rating, right half for full rating
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-between items-center">
              <button
                onClick={() => {
                  setShowRatingModal(false);
                  setError('');
                  setHoverRating(0);
                }}
                disabled={submitting}
                className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              
              {(hoverRating || userRating) > 0 && (
                <button
                  onClick={() => handleRating(hoverRating || userRating)}
                  disabled={submitting}
                  className="bg-orange-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  {hasRated ? 'Update Rating' : 'Submit Rating'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RatingComponent;