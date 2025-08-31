// supabaseReviewService.js - Cleaned up to use only device_id
import { supabase } from './supabaseClient.js';

// Get all reviews for a restaurant
export const getRestaurantReviews = async (restaurantId) => {
  try {
    console.log('Fetching reviews for restaurant:', restaurantId);
    
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error fetching reviews:', error);
      return [];
    }

    console.log('Reviews data:', data);
    return data || [];
  } catch (error) {
    console.error('Error in getRestaurantReviews:', error);
    return [];
  }
};

// Add a new review - using only device_id
export const addReview = async (restaurantId, reviewData, deviceId) => {
  try {
    if (!deviceId) {
      console.error('Device ID is required');
      return false;
    }

    // Validate restaurant exists
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, name')
      .eq('id', restaurantId)
      .single();

    if (restaurantError || !restaurant) {
      console.error('Restaurant not found:', restaurantError);
      return false;
    }

    // Prepare review data - only device_id needed
    const dbData = {
      restaurant_id: restaurantId,
      device_id: deviceId,
      user_ip: 'legacy', // Keep for schema compatibility but not used
      reviewer_name: reviewData.reviewerName?.trim() || 'Anonymous',
      comment: reviewData.comment?.trim() || '',
      images: reviewData.images || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Validate required fields
    if (!dbData.comment && (!dbData.images || dbData.images.length === 0)) {
      console.error('Review must have either a comment or images');
      return false;
    }

    // Insert review
    const { data, error } = await supabase
      .from('reviews')
      .insert([dbData])
      .select();

    if (error) {
      console.error('Supabase error inserting review:', error);
      return false;
    }

    return true;

  } catch (error) {
    console.error('Error in addReview:', error);
    return false;
  }
};

// Update existing review - using only device_id
export const updateReview = async (restaurantId, reviewData, deviceId) => {
  try {
    console.log('Updating review:', { restaurantId, reviewData, deviceId });

    if (!deviceId) {
      console.error('Device ID is required');
      return false;
    }

    // Prepare update data
    const updateData = {
      reviewer_name: reviewData.reviewerName?.trim() || 'Anonymous',
      comment: reviewData.comment?.trim() || '',
      images: reviewData.images || [],
      updated_at: new Date().toISOString()
    };

    // Validate required fields
    if (!updateData.comment && (!updateData.images || updateData.images.length === 0)) {
      console.error('Review must have either a comment or images');
      return false;
    }

    // Update using device_id
    const { data, error } = await supabase
      .from('reviews')
      .update(updateData)
      .eq('restaurant_id', restaurantId)
      .eq('device_id', deviceId)
      .select();

    if (error) {
      console.error('Supabase error updating review:', error);
      return false;
    }

    if (!data || data.length === 0) {
      console.error('No review found to update for device_id:', deviceId);
      return false;
    }

    console.log('✅ Successfully updated review:', data[0]);
    return true;

  } catch (error) {
    console.error('Error in updateReview:', error);
    return false;
  }
};

// Check if user has already reviewed this restaurant
export const hasUserReviewed = async (restaurantId, deviceId) => {
  try {
    if (!deviceId) {
      return false;
    }

    const { data, error } = await supabase
      .from('reviews')
      .select('review_id')
      .eq('restaurant_id', restaurantId)
      .eq('device_id', deviceId)
      .maybeSingle();

    if (error) {
      console.error('Error checking if user reviewed:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error in hasUserReviewed:', error);
    return false;
  }
};

// Get user's previous review for this restaurant
export const getUserReview = async (restaurantId, deviceId) => {
  try {
    if (!deviceId) {
      return null;
    }

    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('device_id', deviceId)
      .maybeSingle();

    if (error) {
      console.error('Error getting user review:', error);
      return null;
    }

    return data || null;
  } catch (error) {
    console.error('Error in getUserReview:', error);
    return null;
  }
};

// Delete a review
export const deleteReview = async (restaurantId, deviceId) => {
  try {
    if (!deviceId) {
      console.error('Device ID is required');
      return false;
    }

    const { data, error } = await supabase
      .from('reviews')
      .delete()
      .eq('restaurant_id', restaurantId)
      .eq('device_id', deviceId)
      .select();

    if (error) {
      console.error('Supabase error deleting review:', error);
      return false;
    }

    if (!data || data.length === 0) {
      console.error('No review found to delete for device_id:', deviceId);
      return false;
    }

    console.log('✅ Successfully deleted review:', data[0]);
    return true;

  } catch (error) {
    console.error('Error in deleteReview:', error);
    return false;
  }
};

// Get review statistics for a restaurant
export const getReviewStats = async (restaurantId) => {
  try {
    // Get reviews count
    const { data: reviewsData, error: reviewsError } = await supabase
      .from('reviews')
      .select('review_id')
      .eq('restaurant_id', restaurantId);

    if (reviewsError) {
      console.error('Error fetching review count:', reviewsError);
    }

    // Get ratings data for average and distribution
    const { data: ratingsData, error: ratingsError } = await supabase
      .from('ratings')
      .select('rating')
      .eq('restaurant_id', restaurantId);

    if (ratingsError) {
      console.error('Error fetching ratings stats:', ratingsError);
      return {
        totalReviews: reviewsData?.length || 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
    }

    const reviewCount = reviewsData?.length || 0;

    if (!ratingsData || ratingsData.length === 0) {
      return {
        totalReviews: reviewCount,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
    }

    const ratings = ratingsData.map(item => item.rating);
    const average = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
    
    // Calculate distribution
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach(rating => {
      if (rating >= 1 && rating <= 5) {
        ratingDistribution[rating]++;
      }
    });

    return {
      totalReviews: reviewCount,
      averageRating: Math.round(average * 10) / 10,
      ratingDistribution
    };
  } catch (error) {
    console.error('Error in getReviewStats:', error);
    return {
      totalReviews: 0,
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };
  }
};

// Get recent reviews across all restaurants
export const getRecentReviews = async (limit = 10) => {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        restaurant:restaurants!reviews_restaurant_id_fkey(id, name, image_url)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent reviews:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getRecentReviews:', error);
    return [];
  }
};

// Get top rated restaurants based on ratings
export const getTopRatedRestaurants = async (limit = 5) => {
  try {
    const { data, error } = await supabase
      .from('restaurant_stats')
      .select('*')
      .gte('average_rating', 4)
      .order('average_rating', { ascending: false })
      .order('total_reviews', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching top restaurants:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getTopRatedRestaurants:', error);
    return [];
  }
};