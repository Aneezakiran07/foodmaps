// supabaseRatingService.js - Fixed to match your new schema
import { supabase } from './supabaseClient.js';

// Get user's IP address
const getUserIP = async () => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('Error getting IP:', error);
    return 'anonymous';
  }
};

// Get all ratings for a restaurant with average calculation
export const getRestaurantRatings = async (restaurantId) => {
  try {
    console.log('Fetching ratings for restaurant:', restaurantId);
    
    const { data, error } = await supabase
      .from('ratings')
      .select('rating')
      .eq('restaurant_id', restaurantId); // FIXED: was 'restraunt_id'

    if (error) {
      console.error('Supabase error fetching ratings:', error);
      return { ratings: [], average: 0, count: 0 };
    }

    console.log('Ratings data:', data);

    if (!data || data.length === 0) {
      return { ratings: [], average: 0, count: 0 };
    }

    const ratings = data.map(item => item.rating);
    const average = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
    
    return {
      ratings,
      average: Math.round(average * 10) / 10,
      count: ratings.length
    };
  } catch (error) {
    console.error('Error in getRestaurantRatings:', error);
    return { ratings: [], average: 0, count: 0 };
  }
};

// Add or update a user's rating
export const addRating = async (restaurantId, rating, userIP = null) => {
  try {
    console.log('Adding rating:', { restaurantId, rating, userIP });

    // Get IP if not provided
    if (!userIP || userIP === 'anonymous') {
      userIP = await getUserIP();
    }

    // Validate rating
    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      console.error('Invalid rating:', rating);
      return false;
    }

    // Validate restaurantId
    if (!restaurantId) {
      console.error('Missing restaurantId');
      return false;
    }

    // First check if the user already has a rating
    const { data: existingRating, error: checkError } = await supabase
      .from('ratings')
      .select('rating_id')
      .eq('restaurant_id', restaurantId) // FIXED: was 'restraunt_id'
      .eq('user_ip', userIP)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing rating:', checkError);
      return false;
    }

    let result;
    
    if (existingRating) {
      // Update existing rating
      console.log('Updating existing rating');
      result = await supabase
        .from('ratings')
        .update({ 
          rating: rating,
          updated_at: new Date().toISOString()
        })
        .eq('restaurant_id', restaurantId) // FIXED: was 'restraunt_id'
        .eq('user_ip', userIP);
    } else {
      // Insert new rating
      console.log('Inserting new rating');
      result = await supabase
        .from('ratings')
        .insert({
          restaurant_id: restaurantId, // FIXED: was 'restraunt_id'
          user_ip: userIP,
          rating: rating,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    }

    if (result.error) {
      console.error('Supabase error adding/updating rating:', result.error);
      return false;
    }

    console.log('Rating operation successful');
    return true;

  } catch (error) {
    console.error('Error in addRating:', error);
    return false;
  }
};

// Check if user has already rated this restaurant
export const hasUserRated = async (restaurantId, userIP = null) => {
  try {
    // Get IP if not provided
    if (!userIP || userIP === 'anonymous') {
      userIP = await getUserIP();
    }

    const { data, error } = await supabase
      .from('ratings')
      .select('rating_id')
      .eq('restaurant_id', restaurantId) // FIXED: was 'restraunt_id'
      .eq('user_ip', userIP)
      .maybeSingle();

    if (error) {
      console.error('Error checking if user rated:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error in hasUserRated:', error);
    return false;
  }
};

// Get user's previous rating for this restaurant
export const getUserRating = async (restaurantId, userIP = null) => {
  try {
    // Get IP if not provided
    if (!userIP || userIP === 'anonymous') {
      userIP = await getUserIP();
    }

    const { data, error } = await supabase
      .from('ratings')
      .select('rating')
      .eq('restaurant_id', restaurantId) // FIXED: was 'restraunt_id'
      .eq('user_ip', userIP)
      .maybeSingle();

    if (error) {
      console.error('Error getting user rating:', error);
      return null;
    }

    return data ? data.rating : null;
  } catch (error) {
    console.error('Error in getUserRating:', error);
    return null;
  }
};

// Export the interface for the RatingComponent
export const SupabaseRatings = {
  async getRestaurantRatings(restaurantId) {
    return getRestaurantRatings(restaurantId);
  },

  async addRating(restaurantId, rating, userIP = 'anonymous') {
    return addRating(restaurantId, rating, userIP);
  },

  async hasUserRated(restaurantId, userIP = 'anonymous') {
    return hasUserRated(restaurantId, userIP);
  },

  async getUserRating(restaurantId, userIP = 'anonymous') {
    return getUserRating(restaurantId, userIP);
  }
};