// File: src/utils/supabaseClient.js
// Enhanced Supabase Client Configuration for Restaurant App with Admin Panel

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

console.log('🔧 Supabase config check:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  url: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'MISSING'
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables!');
  console.error('- REACT_APP_SUPABASE_URL:', supabaseUrl ? '✅' : '❌ MISSING');
  console.error('- REACT_APP_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅' : '❌ MISSING');
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Create Supabase client with optimized settings
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // Since we're not using auth, disable session persistence
    autoRefreshToken: false,
    detectSessionInUrl: false
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-application': 'restaurant-app',
      'x-client-info': 'restaurant-ratings-admin'
    }
  },
  // Add retry logic
  retry: {
    attempts: 3,
    delay: 1000
  }
});

// Test the connection immediately
supabase
  .from('restaurants')
  .select('count', { count: 'exact', head: true })
  .limit(1)
  .then(({ data, error }) => {
    if (error) {
      console.error('❌ Supabase connection test failed:', error);
    } else {
      console.log('✅ Supabase connected successfully');
    }
  })
  .catch((error) => {
    console.error('❌ Supabase connection error:', error);
  });

// Helper functions for common operations
export const supabaseHelpers = {
  // Format Supabase timestamp for display
  formatTimestamp: (timestamp) => {
    if (!timestamp) return 'N/A';
    
    try {
      return new Date(timestamp).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Invalid Date';
    }
  },

  // Format timestamp for relative time (e.g., "2 hours ago")
  formatRelativeTime: (timestamp) => {
    if (!timestamp) return 'Unknown';
    
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffInSeconds = Math.floor((now - date) / 1000);
      
      if (diffInSeconds < 60) return 'Just now';
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
      if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting relative time:', error);
      return 'Unknown';
    }
  },

  // Handle Supabase errors consistently
  handleError: (error) => {
    console.error('Supabase error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    
    // Handle specific Supabase error codes
    switch (error.code) {
      case 'PGRST116':
        return 'No data found';
      case '23505':
        return 'This record already exists';
      case '23503':
        return 'Referenced record does not exist';
      case '23514':
        return 'Data validation failed';
      case 'PGRST301':
        return 'Database query failed';
      case '42P01':
        return 'Table or view does not exist';
      case '42703':
        return 'Column does not exist';
      case '42501':
        return 'Permission denied - check RLS policies';
      case '23502':
        return 'Required field is missing';
      case '22P02':
        return 'Invalid data format';
      default:
        return error.message || 'An unexpected database error occurred';
    }
  },

  // Sanitize user input
  sanitizeInput: (input) => {
    if (typeof input !== 'string') return input;
    
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .substring(0, 1000); // Limit length
  },

  // Get user's IP address (for rating uniqueness)
  getUserIP: async () => {
    try {
      // In production, you might want to use a different service
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.error('Failed to get IP:', error);
      return 'unknown_' + Date.now(); // Fallback to timestamp-based ID
    }
  },

  // Check if Supabase is connected and database is accessible
  checkConnection: async () => {
    try {
      console.log('🔍 Testing Supabase connection...');
      
      // Test basic connection
      const { data, error } = await supabase
        .from('restaurants')
        .select('count', { count: 'exact', head: true })
        .limit(1);
      
      if (error) {
        console.error('❌ Connection test failed:', error);
        return { 
          connected: false, 
          error: supabaseHelpers.handleError(error),
          details: error 
        };
      }
      
      console.log('✅ Connection test successful');
      return { 
        connected: true, 
        message: 'Successfully connected to Supabase',
        tableExists: true
      };
    } catch (error) {
      console.error('❌ Connection test error:', error);
      return { 
        connected: false, 
        error: error.message,
        details: error 
      };
    }
  },

  // Validate required environment variables
  validateConfig: () => {
    const config = {
      url: supabaseUrl,
      hasAnonKey: !!supabaseAnonKey,
      urlValid: supabaseUrl && supabaseUrl.startsWith('https://') && supabaseUrl.includes('.supabase.co'),
      keyValid: supabaseAnonKey && supabaseAnonKey.length > 50
    };

    const isValid = config.urlValid && config.keyValid;

    return {
      isValid,
      config,
      errors: [
        !config.url && 'REACT_APP_SUPABASE_URL is missing',
        !config.hasAnonKey && 'REACT_APP_SUPABASE_ANON_KEY is missing',
        config.url && !config.urlValid && 'REACT_APP_SUPABASE_URL format is invalid',
        config.hasAnonKey && !config.keyValid && 'REACT_APP_SUPABASE_ANON_KEY format is invalid'
      ].filter(Boolean)
    };
  }
};

// Admin-specific functions
export const adminHelpers = {
  // SIMPLIFIED: Admin login without RPC (you can implement simple auth later)
// Replace the adminLogin function in your supabaseClient.js with this:

adminLogin: async (username, password) => {
  try {
    console.log('🔐 Attempting admin login for username:', username);
    
    // First, get the admin user from database
    const { data: adminUser, error: fetchError } = await supabase
      .from('admin_auth')
      .select('*')
      .eq('username', username)
      .single();

    if (fetchError) {
      console.error('Admin user fetch error:', fetchError);
      throw new Error('Invalid username or password');
    }

    if (!adminUser) {
      throw new Error('Invalid username or password');
    }

    // Check if account is locked
    if (adminUser.locked_until && new Date(adminUser.locked_until) > new Date()) {
      throw new Error('Account is temporarily locked. Please try again later.');
    }

    // Simple password comparison (for development)
    // In production, you should hash the password with the salt and compare
    const isValidPassword = password === adminUser.password_hash;

    if (!isValidPassword) {
      // Update failed attempts
      await supabase
        .from('admin_auth')
        .update({ 
          failed_attempts: adminUser.failed_attempts + 1,
          locked_until: adminUser.failed_attempts >= 4 ? 
            new Date(Date.now() + 15 * 60 * 1000).toISOString() : // Lock for 15 minutes after 5 attempts
            null
        })
        .eq('id', adminUser.id);

      throw new Error('Invalid username or password');
    }

    // Reset failed attempts and update last login
    await supabase
      .from('admin_auth')
      .update({ 
        failed_attempts: 0,
        locked_until: null,
        last_login: new Date().toISOString()
      })
      .eq('id', adminUser.id);

    // Log the activity
    await supabase
      .from('admin_activity')
      .insert({
        admin_id: adminUser.id,
        action: 'login',
        ip_address: await supabaseHelpers.getUserIP(),
        user_agent: navigator.userAgent
      });

    console.log('✅ Admin login successful');
    
    // Create session data
    const sessionData = {
      admin_id: adminUser.id,
      username: adminUser.username,
      login_time: new Date().toISOString()
    };

    return {
      success: true,
      message: 'Login successful',
      jwt_payload: sessionData,
      expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString() // 8 hours
    };

  } catch (error) {
    console.error('❌ Admin login error:', error);
    return {
      success: false,
      error: error.message || 'Login failed'
    };
  }
},

  // Fetch all restaurants for admin with correct schema
  fetchAllRestaurants: async () => {
    try {
      console.log('📊 Fetching all restaurants...');
      
      const { data, error } = await supabase
        .from('restaurants')
        .select(`
          *,
          restaurant_cuisines(
            cuisines(
              id,
              name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to match expected format
      const transformedData = data?.map(restaurant => ({
        ...restaurant,
        cuisines: restaurant.restaurant_cuisines?.map(rc => rc.cuisines) || []
      })) || [];

      console.log('✅ Restaurants fetched:', transformedData.length);
      return transformedData;
    } catch (error) {
      console.error('❌ Error fetching restaurants:', error);
      throw new Error(supabaseHelpers.handleError(error));
    }
  },

  // Fetch all cuisines for admin
  fetchAllCuisines: async () => {
    try {
      console.log('🍽️ Fetching all cuisines...');
      
      const { data, error } = await supabase
        .from('cuisines')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      console.log('✅ Cuisines fetched:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching cuisines:', error);
      throw new Error(supabaseHelpers.handleError(error));
    }
  },

  // Fetch all ratings/reviews for admin with correct schema
  fetchAllRatings: async () => {
    try {
      console.log('⭐ Fetching all ratings...');
      
      const { data, error } = await supabase
        .from('ratings')
        .select(`
          *,
          restaurants (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('✅ Ratings fetched:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching ratings:', error);
      throw new Error(supabaseHelpers.handleError(error));
    }
  },

  // Get admin dashboard stats
  getAdminStats: async () => {
    try {
      console.log('📈 Fetching admin stats...');
      
      // Get total restaurants
      const { count: restaurantCount, error: restaurantsError } = await supabase
        .from('restaurants')
        .select('*', { count: 'exact', head: true });

      if (restaurantsError) throw restaurantsError;

      // Get total ratings
      const { count: ratingsCount, error: ratingsError } = await supabase
        .from('ratings')
        .select('*', { count: 'exact', head: true });

      if (ratingsError) throw ratingsError;

      // Get average rating
      const { data: avgRatingData, error: avgRatingError } = await supabase
        .from('ratings')
        .select('rating')
        .not('rating', 'is', null);

      if (avgRatingError) throw avgRatingError;

      // Calculate average rating
      const totalRating = avgRatingData?.reduce((sum, item) => sum + item.rating, 0) || 0;
      const avgRating = avgRatingData?.length > 0 ? (totalRating / avgRatingData.length).toFixed(1) : 0;

      const stats = {
        totalRestaurants: restaurantCount || 0,
        totalRatings: ratingsCount || 0,
        averageRating: parseFloat(avgRating) || 0
      };

      console.log('✅ Admin stats fetched:', stats);
      return stats;
    } catch (error) {
      console.error('❌ Error fetching admin stats:', error);
      throw new Error(supabaseHelpers.handleError(error));
    }
  },

  // Create a new restaurant
  createRestaurant: async (restaurantData) => {
    try {
      console.log('🏭 Creating restaurant...');
      
      const { data, error } = await supabase
        .from('restaurants')
        .insert([{
          name: supabaseHelpers.sanitizeInput(restaurantData.name),
          image_url: restaurantData.image_url,
          description: supabaseHelpers.sanitizeInput(restaurantData.description),
          phone: supabaseHelpers.sanitizeInput(restaurantData.phone),
          address: supabaseHelpers.sanitizeInput(restaurantData.address),
          is_active: restaurantData.is_active
        }])
        .select();

      if (error) throw error;

      console.log('✅ Restaurant created:', data?.[0]);
      return data?.[0];
    } catch (error) {
      console.error('❌ Error creating restaurant:', error);
      throw new Error(supabaseHelpers.handleError(error));
    }
  },

  // Update a restaurant
  updateRestaurant: async (id, restaurantData) => {
    try {
      console.log('🔧 Updating restaurant:', id);
      
      const { data, error } = await supabase
        .from('restaurants')
        .update({
          name: supabaseHelpers.sanitizeInput(restaurantData.name),
          image_url: restaurantData.image_url,
          description: supabaseHelpers.sanitizeInput(restaurantData.description),
          phone: supabaseHelpers.sanitizeInput(restaurantData.phone),
          address: supabaseHelpers.sanitizeInput(restaurantData.address),
          is_active: restaurantData.is_active
        })
        .eq('id', id)
        .select();

      if (error) throw error;

      console.log('✅ Restaurant updated:', data?.[0]);
      return data?.[0];
    } catch (error) {
      console.error('❌ Error updating restaurant:', error);
      throw new Error(supabaseHelpers.handleError(error));
    }
  },

  // Delete a restaurant
  deleteRestaurant: async (id) => {
    try {
      console.log('🗑️ Deleting restaurant:', id);
      
      const { error } = await supabase
        .from('restaurants')
        .delete()
        .eq('id', id);

      if (error) throw error;

      console.log('✅ Restaurant deleted');
      return true;
    } catch (error) {
      console.error('❌ Error deleting restaurant:', error);
      throw new Error(supabaseHelpers.handleError(error));
    }
  },

  // Delete a rating with correct column name
  deleteRating: async (id) => {
    try {
      console.log('🗑️ Deleting rating:', id);
      
      const { error } = await supabase
        .from('ratings')
        .delete()
        .eq('rating_id', id); // Use rating_id instead of review_id

      if (error) throw error;

      console.log('✅ Rating deleted');
      return true;
    } catch (error) {
      console.error('❌ Error deleting rating:', error);
      throw new Error(supabaseHelpers.handleError(error));
    }
  }
};

// Public functions for the main app with correct schema
export const publicHelpers = {
  // Fetch restaurants for public view with correct schema
  fetchRestaurants: async () => {
    try {
      console.log('🏪 Fetching public restaurants...');
      
      const { data, error } = await supabase
        .from('restaurants')
        .select(`
          *,
          restaurant_cuisines(
            cuisines(
              id,
              name
            )
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to match expected format
      const transformedData = data?.map(restaurant => ({
        ...restaurant,
        cuisines: restaurant.restaurant_cuisines?.map(rc => rc.cuisines) || []
      })) || [];

      console.log('✅ Public restaurants fetched:', transformedData.length);
      return transformedData;
    } catch (error) {
      console.error('❌ Error fetching public restaurants:', error);
      throw new Error(supabaseHelpers.handleError(error));
    }
  },

  // Fetch single restaurant with ratings using correct schema
  fetchRestaurantDetail: async (id) => {
    try {
      console.log('🏪 Fetching restaurant detail:', id);
      
      // First get restaurant with cuisines
      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .select(`
          *,
          restaurant_cuisines(
            cuisines(
              id,
              name,
              description
            )
          )
        `)
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (restaurantError) throw restaurantError;

      // Then get ratings and reviews separately and merge them
      const [ratingsResult, reviewsResult] = await Promise.all([
        supabase
          .from('ratings')
          .select('rating_id, rating, created_at, updated_at, user_ip')
          .eq('restaurant_id', id)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('reviews')
          .select('review_id, comment, reviewer_name, created_at, updated_at, user_ip, images')
          .eq('restaurant_id', id)
          .order('created_at', { ascending: false })
      ]);

      if (ratingsResult.error) throw ratingsResult.error;
      if (reviewsResult.error) throw reviewsResult.error;

      // Merge ratings and reviews by user_ip
      const mergedRatings = [];
      const reviewsByUserIp = {};
      const ratingsByUserIp = {};

      // Index reviews by user_ip
      (reviewsResult.data || []).forEach(review => {
        reviewsByUserIp[review.user_ip] = review;
      });

      // Index ratings by user_ip
      (ratingsResult.data || []).forEach(rating => {
        ratingsByUserIp[rating.user_ip] = rating;
      });

      // Create merged entries
      const allUserIps = new Set([
        ...Object.keys(reviewsByUserIp),
        ...Object.keys(ratingsByUserIp)
      ]);

      allUserIps.forEach(userIp => {
        const review = reviewsByUserIp[userIp];
        const rating = ratingsByUserIp[userIp];

        mergedRatings.push({
          review_id: review?.review_id || `rating_${rating?.rating_id}`,
          rating: rating?.rating || null,
          comment: review?.comment || null,
          reviewer_name: review?.reviewer_name || 'Anonymous',
          created_at: review?.created_at || rating?.created_at,
          updated_at: review?.updated_at || rating?.updated_at,
          user_ip: userIp,
          images: review?.images || null
        });
      });

      // Sort by created_at descending
      mergedRatings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      // Transform restaurant data
      const result = {
        ...restaurant,
        cuisines: restaurant.restaurant_cuisines?.map(rc => rc.cuisines) || [],
        ratings: mergedRatings
      };

      console.log('✅ Restaurant detail fetched');
      return result;
    } catch (error) {
      console.error('❌ Error fetching restaurant detail:', error);
      throw new Error(supabaseHelpers.handleError(error));
    }
  },

  // Submit a rating with correct table structure
  submitRating: async (restaurantId, rating, comment, reviewerName) => {
    try {
      console.log('⭐ Submitting rating for restaurant:', restaurantId);
      
      const userIP = await supabaseHelpers.getUserIP();
      
      // Add rating to ratings table
      const { data: ratingData, error: ratingError } = await supabase
        .from('ratings')
        .upsert({
          restaurant_id: restaurantId,
          user_ip: userIP,
          rating: rating,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'restaurant_id,user_ip'
        })
        .select();

      if (ratingError) throw ratingError;

      // Add review if comment or name provided
      if (comment || reviewerName) {
        const { data: reviewData, error: reviewError } = await supabase
          .from('reviews')
          .upsert({
            restaurant_id: restaurantId,
            user_ip: userIP,
            comment: supabaseHelpers.sanitizeInput(comment),
            reviewer_name: supabaseHelpers.sanitizeInput(reviewerName || 'Anonymous'),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'restaurant_id,user_ip'
          })
          .select();

        if (reviewError) {
          console.error('Error adding review (rating still saved):', reviewError);
        }
      }

      console.log('✅ Rating submitted');
      return ratingData?.[0];
    } catch (error) {
      console.error('❌ Error submitting rating:', error);
      throw new Error(supabaseHelpers.handleError(error));
    }
  }
};

// Export configuration validation on import
const configValidation = supabaseHelpers.validateConfig();
if (!configValidation.isValid) {
  console.error('❌ Supabase configuration errors:', configValidation.errors);
} else {
  console.log('✅ Supabase configuration is valid');
}

export default supabase;