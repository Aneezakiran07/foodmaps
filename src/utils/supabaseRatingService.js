// supabaseRatingService.js - Fixed to allow float ratings
import { supabase } from './supabaseClient.js';

// Device ID utility functions
const getDeviceId = () => {
  const STORAGE_KEY = 'restaurant_app_device_id';
  let storedDeviceId = localStorage.getItem(STORAGE_KEY);
  if (!storedDeviceId) {
    storedDeviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem(STORAGE_KEY, storedDeviceId);
  }
  return storedDeviceId;
};

// Set device context for RLS policies
const setDeviceIdContext = async (deviceId) => {
  try {
    const { error } = await supabase.rpc('set_config', {
      setting_name: 'app.current_device_id',
      setting_value: deviceId,
      is_local: true
    });
    if (error) {
      console.error('Error setting device ID context:', error);
    }
    return !error;
  } catch (error) {
    console.error('Error in setDeviceIdContext:', error);
    return false;
  }
};

// Get user's IP address (fallback for legacy support)
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

// Get restaurant ratings from materialized view (much faster)
export const getRestaurantRatings = async (restaurantId) => {
  try {
    console.log('Fetching ratings for restaurant:', restaurantId);
    
    // First try to get from materialized view
    const { data: statsData, error: statsError } = await supabase
      .from('restaurant_stats')
      .select('average_rating, total_ratings')
      .eq('id', restaurantId)
      .maybeSingle();
    
    if (statsError) {
      console.error('Error fetching from restaurant_stats:', statsError);
      // Fallback to direct calculation if materialized view fails
      return await getRestaurantRatingsFallback(restaurantId);
    }
    
    if (!statsData) {
      console.log('No stats found for restaurant:', restaurantId);
      return { ratings: [], average: 0, count: 0 };
    }
    
    console.log('Stats data from materialized view:', statsData);
    
    return {
      ratings: [], // We don't need individual ratings for display
      average: Math.round(parseFloat(statsData.average_rating) * 10) / 10,
      count: parseInt(statsData.total_ratings) || 0
    };
  } catch (error) {
    console.error('Error in getRestaurantRatings:', error);
    // Fallback to direct calculation
    return await getRestaurantRatingsFallback(restaurantId);
  }
};

// Fallback method using direct calculation (original method)
const getRestaurantRatingsFallback = async (restaurantId) => {
  try {
    console.log('Using fallback method for restaurant:', restaurantId);
    
    const { data, error } = await supabase
      .from('ratings')
      .select('rating')
      .eq('restaurant_id', restaurantId);
      
    if (error) {
      console.error('Supabase error fetching ratings:', error);
      return { ratings: [], average: 0, count: 0 };
    }
    
    console.log('Fallback ratings data:', data);
    
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
    console.error('Error in fallback method:', error);
    return { ratings: [], average: 0, count: 0 };
  }
};

// FIXED: Add or update a user's rating using device ID - NOW ALLOWS FLOAT RATINGS
export const addRating = async (restaurantId, rating, deviceId = null) => {
  try {
    console.log('Adding rating:', { restaurantId, rating, ratingType: typeof rating, deviceId });
    
    // Get device ID if not provided
    if (!deviceId) {
      deviceId = getDeviceId();
    }
    
    // Set device context for RLS
    await setDeviceIdContext(deviceId);
    
    // FIXED: Proper validation for float ratings
    const numericRating = parseFloat(rating);
    
    // Allow both integers and half-step decimals (1.0, 1.5, 2.0, 2.5, etc.)
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      console.error('Invalid rating - must be between 1 and 5:', numericRating);
      return false;
    }
    
    // Optional: Restrict to half-steps only (1.0, 1.5, 2.0, 2.5, etc.)
    const roundedRating = Math.round(numericRating * 2) / 2; // Rounds to nearest 0.5
    if (Math.abs(numericRating - roundedRating) > 0.01) {
      console.warn('Rating rounded to nearest half-step:', numericRating, '->', roundedRating);
    }
    
    console.log('Final rating to be stored:', roundedRating);
    
    // Validate restaurantId
    if (!restaurantId) {
      console.error('Missing restaurantId');
      return false;
    }
    
    // Get IP for legacy support
    const userIP = await getUserIP();
    
    // First check if the user already has a rating
    const { data: existingRating, error: checkError } = await supabase
      .from('ratings')
      .select('rating_id')
      .eq('restaurant_id', restaurantId)
      .eq('device_id', deviceId)
      .maybeSingle();
      
    if (checkError) {
      console.error('Error checking existing rating:', checkError);
      return false;
    }
    
    let result;
    
    if (existingRating) {
      // Update existing rating
      console.log('Updating existing rating with float value:', roundedRating);
      result = await supabase
        .from('ratings')
        .update({ 
          rating: roundedRating, // ← Now using float value
          updated_at: new Date().toISOString()
        })
        .eq('restaurant_id', restaurantId)
        .eq('device_id', deviceId);
    } else {
      // Insert new rating
      console.log('Inserting new rating with float value:', roundedRating);
      result = await supabase
        .from('ratings')
        .insert({
          restaurant_id: restaurantId,
          device_id: deviceId,
          user_ip: userIP,
          rating: roundedRating, // ← Now using float value
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    }
    
    if (result.error) {
      console.error('Supabase error adding/updating rating:', result.error);
      return false;
    }
    
    console.log('Rating operation successful with float rating:', roundedRating);
    
    // Refresh materialized view
    await supabase.rpc('refresh_materialized_view', { 
      view_name: 'restaurant_stats' 
    });
    
    return true;
  } catch (error) {
    console.error('Error in addRating:', error);
    return false;
  }
};

// Check if user has already rated this restaurant using device ID
export const hasUserRated = async (restaurantId, deviceId = null) => {
  try {
    // Get device ID if not provided
    if (!deviceId) {
      deviceId = getDeviceId();
    }
    
    const { data, error } = await supabase
      .from('ratings')
      .select('rating_id')
      .eq('restaurant_id', restaurantId)
      .eq('device_id', deviceId)
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

// Get user's previous rating for this restaurant using device ID
export const getUserRating = async (restaurantId, deviceId = null) => {
  try {
    // Get device ID if not provided
    if (!deviceId) {
      deviceId = getDeviceId();
    }
    
    const { data, error } = await supabase
      .from('ratings')
      .select('rating')
      .eq('restaurant_id', restaurantId)
      .eq('device_id', deviceId)
      .maybeSingle();
      
    if (error) {
      console.error('Error getting user rating:', error);
      return null;
    }
    
    return data ? parseFloat(data.rating) : null; // ← Ensure float return
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
  
  async addRating(restaurantId, rating, deviceId = null) {
    return addRating(restaurantId, rating, deviceId);
  },
  
  async hasUserRated(restaurantId, deviceId = null) {
    return hasUserRated(restaurantId, deviceId);
  },
  
  async getUserRating(restaurantId, deviceId = null) {
    return getUserRating(restaurantId, deviceId);
  }
};