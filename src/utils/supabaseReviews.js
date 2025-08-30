// supabaseReviews.js - Fixed wrapper to match your schema
import {
  getRestaurantReviews,
  addReview,
  updateReview,
  getUserReview,
  hasUserReviewed,
  deleteReview,
  getReviewStats,
  getRecentReviews,
  getTopRatedRestaurants // FIXED: was getTopReviews
} from './supabaseReviewService.js';


export const SupabaseReviews = {
  // Get all reviews for a restaurant
  async getRestaurantReviews(restaurantId) {
    try {
      if (!restaurantId) {
        console.error('Restaurant ID is required');
        return [];
      }
      
      const reviews = await getRestaurantReviews(restaurantId);
      return reviews || [];
    } catch (error) {
      console.error('Error in SupabaseReviews.getRestaurantReviews:', error);
      return [];
    }
  },

  // Add a new review
  async addReview(restaurantId, reviewData, userIP = null) {
    try {
      console.log('SupabaseReviews.addReview called with:', { restaurantId, reviewData, userIP });
      
      // Validate input data
      if (!restaurantId) {
        console.error('Restaurant ID is required');
        return false;
      }
      
      if (!reviewData) {
        console.error('Review data is required');
        return false;
      }

      // At least comment or images required
      const hasComment = reviewData.comment && reviewData.comment.trim();
      const hasImages = reviewData.images && reviewData.images.length > 0;
      
      if (!hasComment && !hasImages) {
        console.error('Review must have either a comment or images');
        return false;
      }

      const result = await addReview(restaurantId, reviewData, userIP);
      return result;
    } catch (error) {
      console.error('Error in SupabaseReviews.addReview:', error);
      return false;
    }
  },

  // Update existing review
  async updateReview(restaurantId, reviewData, userIP = null) {
    try {
      console.log('SupabaseReviews.updateReview called with:', { restaurantId, reviewData, userIP });
      
      // Validate input data
      if (!restaurantId) {
        console.error('Restaurant ID is required');
        return false;
      }
      
      if (!reviewData) {
        console.error('Review data is required');
        return false;
      }

      // At least comment or images required
      const hasComment = reviewData.comment && reviewData.comment.trim();
      const hasImages = reviewData.images && reviewData.images.length > 0;
      
      if (!hasComment && !hasImages) {
        console.error('Review must have either a comment or images');
        return false;
      }

      const result = await updateReview(restaurantId, reviewData, userIP);
      return result;
    } catch (error) {
      console.error('Error in SupabaseReviews.updateReview:', error);
      return false;
    }
  },

  // Check if user has already reviewed (by IP)
  async hasUserReviewed(restaurantId, userIP = null) {
    try {
      if (!restaurantId) {
        return false;
      }
      
      const hasReviewed = await hasUserReviewed(restaurantId, userIP);
      return hasReviewed;
    } catch (error) {
      console.error('Error in SupabaseReviews.hasUserReviewed:', error);
      return false;
    }
  },

  // Get user's previous review
  async getUserReview(restaurantId, userIP = null) {
    try {
      if (!restaurantId) {
        return null;
      }
      
      const review = await getUserReview(restaurantId, userIP);
      return review;
    } catch (error) {
      console.error('Error in SupabaseReviews.getUserReview:', error);
      return null;
    }
  },

  // Delete a review
  async deleteReview(restaurantId, userIP = null) {
    try {
      if (!restaurantId) {
        console.error('Restaurant ID is required');
        return false;
      }
      
      const result = await deleteReview(restaurantId, userIP);
      return result;
    } catch (error) {
      console.error('Error in SupabaseReviews.deleteReview:', error);
      return false;
    }
  },

  // Get review statistics
  async getReviewStats(restaurantId) {
    try {
      if (!restaurantId) {
        return {
          totalReviews: 0,
          averageRating: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        };
      }
      
      const stats = await getReviewStats(restaurantId);
      return stats || {
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
    } catch (error) {
      console.error('Error in SupabaseReviews.getReviewStats:', error);
      return {
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
    }
  },

  // Get recent reviews across all restaurants
  async getRecentReviews(limit = 10) {
    try {
      const reviews = await getRecentReviews(limit);
      return reviews || [];
    } catch (error) {
      console.error('Error in SupabaseReviews.getRecentReviews:', error);
      return [];
    }
  },

  // Get top rated restaurants (FIXED: renamed from getTopReviews)
  async getTopRatedRestaurants(limit = 5) {
    try {
      const restaurants = await getTopRatedRestaurants(limit);
      return restaurants || [];
    } catch (error) {
      console.error('Error in SupabaseReviews.getTopRatedRestaurants:', error);
      return [];
    }
  },

  // Keep backward compatibility - alias for getTopRatedRestaurants
  async getTopReviews(restaurantId, limit = 5) {
    try {
      if (!restaurantId) {
        return [];
      }
      
      // This function was removed from the service, but if you need it
      // you can implement it here or just return empty array
      console.warn('getTopReviews is deprecated, use getTopRatedRestaurants instead');
      return [];
    } catch (error) {
      console.error('Error in SupabaseReviews.getTopReviews:', error);
      return [];
    }
  }
};

// Default export for easier imports
export default SupabaseReviews;