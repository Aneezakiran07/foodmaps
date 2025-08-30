import React, { useState, useEffect } from 'react';
import { FiStar } from 'react-icons/fi';
import { GistRatings } from '../utils/gistRatings';

const HeaderRatingComponent = ({ restaurantId, restaurantName }) => {
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [userIP, setUserIP] = useState('anonymous');
  const [showRatingTooltip, setShowRatingTooltip] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  useEffect(() => {
    const loadRatings = async () => {
      try {
        // Get user's IP
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        setUserIP(ipData.ip);

        // Get restaurant ratings
        const ratings = await GistRatings.getRestaurantRatings(restaurantId);
        setAverageRating(ratings.averageRating);
        setTotalRatings(ratings.totalRatings);

        // Check if user has already rated
        const userHasRated = await GistRatings.hasUserRated(restaurantId, ipData.ip);
        if (userHasRated) {
          const userRating = await GistRatings.getUserRating(restaurantId, ipData.ip);
          setUserRating(userRating);
          setHasRated(true);
        }
      } catch (error) {
        console.error('Error loading ratings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRatings();
  }, [restaurantId]);

  const handleRating = async (rating) => {
    setSubmitting(true);
    try {
      const result = await GistRatings.addRating(restaurantId, rating, userIP);
      if (result.success) {
        setUserRating(rating);
        setAverageRating(result.averageRating);
        setTotalRatings(result.totalRatings);
        setHasRated(true);
        setShowRatingTooltip(false);
        setShowSuccessMessage(true);
        
        // Auto-dismiss success message after 3 seconds
        setTimeout(() => {
          setShowSuccessMessage(false);
        }, 3000);
      } else {
        alert('Failed to submit rating. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      alert('Failed to submit rating. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStarHover = (rating) => {
    setHoverRating(rating);
  };

  const handleStarLeave = () => {
    setHoverRating(0);
  };

  // Close tooltips when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showRatingTooltip || showSuccessMessage) {
        const target = event.target;
        if (!target.closest('.rating-component')) {
          setShowRatingTooltip(false);
          setShowSuccessMessage(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showRatingTooltip, showSuccessMessage]);

  if (loading) {
    return (
      <div className="flex items-center bg-black bg-opacity-30 px-4 py-2 rounded-full">
        <div className="animate-pulse bg-gray-300 h-5 w-20 rounded"></div>
      </div>
    );
  }

  return (
    <div className="relative rating-component">
      {/* Main Rating Display */}
      <div 
        className="flex items-center bg-black bg-opacity-30 px-4 py-2 rounded-full w-fit cursor-pointer hover:bg-opacity-40 transition-all duration-200"
        onClick={() => !hasRated && setShowRatingTooltip(!showRatingTooltip)}
      >
        <div className="flex items-center mr-3">
          {[1, 2, 3, 4, 5].map((star) => (
            <FiStar
              key={star}
              className={`w-5 h-5 ${
                star <= averageRating ? 'text-yellow-400 fill-current' : 'text-gray-300'
              }`}
            />
          ))}
        </div>
        <div className="text-right">
          <div className="font-bold text-lg">{averageRating > 0 ? averageRating.toFixed(1) : '0.0'}</div>
          <div className="text-xs opacity-80">
            {totalRatings} {totalRatings === 1 ? 'rating' : 'ratings'}
          </div>
        </div>
        {!hasRated && (
          <div className="ml-2 text-xs opacity-70">
            {showRatingTooltip ? '✕' : 'Rate'}
          </div>
        )}
      </div>

      {/* Rating Tooltip */}
      {showRatingTooltip && !hasRated && (
        <div className="absolute top-full mt-2 left-0 bg-white rounded-lg shadow-xl p-4 z-50 min-w-64">
          <div className="text-center">
            <h4 className="font-semibold text-gray-800 mb-3">Rate {restaurantName}</h4>
            
            {/* Interactive Stars */}
            <div className="flex justify-center mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRating(star)}
                  onMouseEnter={() => handleStarHover(star)}
                  onMouseLeave={handleStarLeave}
                  disabled={submitting}
                  className="p-1 disabled:opacity-50 transform hover:scale-110 transition-all duration-200"
                >
                  <FiStar
                    className={`w-8 h-8 transition-all duration-200 ${
                      star <= (hoverRating || userRating) 
                        ? 'text-yellow-400 fill-current drop-shadow-lg' 
                        : 'text-gray-300 hover:text-yellow-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            
            <p className="text-sm text-gray-600 mb-3">
              {hoverRating ? `Rate ${hoverRating} stars` : 'Click to rate'}
            </p>
            
            {submitting && (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500 mr-2"></div>
                <span className="text-sm text-gray-500">Submitting...</span>
              </div>
            )}
            
            <button
              onClick={() => setShowRatingTooltip(false)}
              className="text-xs text-gray-500 hover:text-gray-700 mt-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Success Message */}
      {hasRated && showSuccessMessage && (
        <div className="absolute top-full mt-2 left-0 bg-green-50 border border-green-200 rounded-lg p-3 z-50 min-w-48 shadow-lg">
          <div className="text-center">
            <div className="flex justify-center mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <FiStar
                  key={star}
                  className={`w-4 h-4 ${
                    star <= userRating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <p className="text-sm font-medium text-green-800">
              You rated {userRating} stars
            </p>
            <p className="text-xs text-green-600 mt-1">
              Thanks for your rating!
            </p>
            <button
              onClick={() => setShowSuccessMessage(false)}
              className="text-xs text-green-600 hover:text-green-800 mt-2 underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HeaderRatingComponent; 