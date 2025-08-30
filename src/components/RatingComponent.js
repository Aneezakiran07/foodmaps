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
  const [userIP, setUserIP] = useState('anonymous');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadRatings = async () => {
      if (!restaurantId) {
        setLoading(false);
        return;
      }

      try {
        setError('');
        
        // Get user's IP
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        setUserIP(ipData.ip);

        // Get restaurant ratings
        const ratings = await SupabaseRatings.getRestaurantRatings(restaurantId);
        setAverageRating(ratings.average || 0);
        setTotalRatings(ratings.count || 0);

        // Check if user has already rated
        const userHasRated = await SupabaseRatings.hasUserRated(restaurantId, ipData.ip);
        if (userHasRated) {
          const existingRating = await SupabaseRatings.getUserRating(restaurantId, ipData.ip);
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
      const result = await SupabaseRatings.addRating(restaurantId, rating, userIP);
      
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
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading ratings...</p>
        </div>
      </div>
    );
  }

  if (error && !showRatingModal) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="text-center">
          <p className="text-sm text-red-600">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 text-xs text-orange-600 hover:text-orange-800"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Compact Rating Display */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <FiStar
                  key={star}
                  className={`w-5 h-5 ${
                    star <= averageRating
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {averageRating > 0 ? averageRating.toFixed(1) : '0.0'} out of 5
              </p>
              <p className="text-xs text-gray-500">
                {totalRatings} rating{totalRatings !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setShowRatingModal(true)}
            className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-orange-600 transition disabled:opacity-50"
            disabled={loading}
          >
            {hasRated ? 'Update Rating' : 'Add Your Rating'}
          </button>
        </div>
        
        {error && (
          <div className="mt-2 text-xs text-red-600">
            {error}
          </div>
        )}
      </div>

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg shadow-lg z-60">
          <p className="font-medium text-sm">Rating submitted successfully!</p>
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Rate {restaurantName || 'Restaurant'}
              </h3>
              <button
                onClick={() => {
                  setShowRatingModal(false);
                  setError('');
                }}
                className="text-gray-400 hover:text-gray-600"
                disabled={submitting}
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center mb-6">
              <div className="flex items-center justify-center space-x-2 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleRating(star)}
                    onMouseEnter={() => handleStarHover(star)}
                    onMouseLeave={handleStarLeave}
                    disabled={submitting}
                    className={`transition-all duration-200 transform hover:scale-110 text-4xl ${
                      star <= (hoverRating || userRating)
                        ? 'text-yellow-400'
                        : 'text-gray-300 hover:text-yellow-300'
                    } ${submitting ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                  >
                    <FiStar 
                      className={`w-8 h-8 ${
                        star <= (hoverRating || userRating)
                          ? 'fill-yellow-400'
                          : ''
                      }`}
                    />
                  </button>
                ))}
              </div>
              
              {hasRated && !submitting && (
                <p className="text-sm text-green-600 mb-2">
                  ✓ You rated this restaurant {userRating} star{userRating !== 1 ? 's' : ''}
                </p>
              )}
              
              {submitting && (
                <p className="text-sm text-blue-600 mb-2">
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></span>
                  Submitting your rating...
                </p>
              )}
              
              {error && (
                <p className="text-sm text-red-600 mb-2">
                  {error}
                </p>
              )}
              
              <p className="text-sm text-gray-600">
                Click on a star to rate this restaurant
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRatingModal(false);
                  setError('');
                }}
                disabled={submitting}
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-gray-400 transition disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RatingComponent;