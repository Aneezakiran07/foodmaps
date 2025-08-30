// supabaseRestaurantService.js - Restaurant management for schema
import { supabase } from './supabaseClient.js';

// Helper function to calculate restaurant ratings from ratings table
const getRestaurantRatings = async (restaurantIds) => {
  try {
    const { data: ratings, error } = await supabase
      .from('ratings')
      .select('restaurant_id, rating') // FIXED: changed from restraunt_id to restaurant_id
      .in('restaurant_id', restaurantIds); // FIXED: changed from restraunt_id

    if (error) {
      console.error('Error fetching ratings:', error);
      return {};
    }

    // Calculate average ratings and total counts for each restaurant
    const ratingStats = {};
    
    if (ratings && ratings.length > 0) {
      ratings.forEach(rating => {
        const restaurantId = rating.restaurant_id; // FIXED: changed from restraunt_id
        if (!ratingStats[restaurantId]) {
          ratingStats[restaurantId] = {
            total: 0,
            count: 0,
            ratings: []
          };
        }
        ratingStats[restaurantId].total += rating.rating;
        ratingStats[restaurantId].count += 1;
        ratingStats[restaurantId].ratings.push(rating.rating);
      });
    }

    // Convert to final format
    const result = {};
    Object.keys(ratingStats).forEach(restaurantId => {
      const stats = ratingStats[restaurantId];
      result[restaurantId] = {
        avg_rating: stats.count > 0 ? (stats.total / stats.count) : 0,
        total_reviews: stats.count
      };
    });

    return result;
  } catch (error) {
    console.error('Error calculating restaurant ratings:', error);
    return {};
  }
};

// Get all active restaurants with stats
export const getAllRestaurants = async () => {
  try {
    console.log('Fetching all restaurants...');
    
    const { data: restaurants, error } = await supabase
      .from('restaurants')
      .select(`
        id,
        name,
        image_url,
        menu_images,
        description,
        phone,
        address,
        is_active,
        restaurant_cuisines(
          cuisines(id, name, description)
        )
      `)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching restaurants:', error);
      return [];
    }

    if (!restaurants || restaurants.length === 0) {
      console.log('No restaurants found');
      return [];
    }

    // Get ratings for all restaurants
    const restaurantIds = restaurants.map(r => r.id);
    const ratingsData = await getRestaurantRatings(restaurantIds);

    // Transform data with ratings
    const result = restaurants.map(restaurant => {
      const ratings = ratingsData[restaurant.id] || { avg_rating: 0, total_reviews: 0 };
      
      return {
        ...restaurant,
        avg_rating: ratings.avg_rating,
        total_reviews: ratings.total_reviews,
        cuisines: restaurant.restaurant_cuisines?.map(rc => rc.cuisines) || [], // FIXED: return full cuisine objects
        // Add backward compatibility
        averageRating: ratings.avg_rating,
        totalRatings: ratings.total_reviews
      };
    });

    console.log('getAllRestaurants result:', result);
    return result;

  } catch (error) {
    console.error('Error in getAllRestaurants:', error);
    return [];
  }
};

// Get restaurant by ID with detailed stats - FIXED: This is the missing function your ShopDetail needs
export const getRestaurantById = async (restaurantId) => {
  try {
    console.log('Getting restaurant by ID:', restaurantId);
    
    const { data, error } = await supabase
      .from('restaurants')
      .select(`
        *,
        restaurant_cuisines(
          cuisines(id, name, description)
        )
      `)
      .eq('id', restaurantId)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching restaurant:', error);
      throw new Error(`Could not find restaurant: ${error.message}`);
    }

    if (!data) {
      console.log('No restaurant found with ID:', restaurantId);
      return null;
    }

    // Get ratings AND reviews for this restaurant
    const [ratingsData, reviewsData] = await Promise.all([
      getRestaurantRatings([restaurantId]),
      getRestaurantReviews(restaurantId)
    ]);

    const ratings = ratingsData[restaurantId] || { avg_rating: 0, total_reviews: 0 };

    const result = {
      ...data,
      avg_rating: ratings.avg_rating,
      total_reviews: ratings.total_reviews,
      cuisines: data.restaurant_cuisines?.map(rc => rc.cuisines) || [], // FIXED: return cuisine objects
      ratings: reviewsData, // Add reviews data
      // Add backward compatibility
      averageRating: ratings.avg_rating,
      totalRatings: ratings.total_reviews
    };

    console.log('getRestaurantById result:', result);
    return result;

  } catch (error) {
    console.error('Error in getRestaurantById:', error);
    throw error;
  }
};

// NEW: Get restaurant reviews with ratings
const getRestaurantReviews = async (restaurantId) => {
  try {
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reviews:', error);
      return [];
    }

    // Also get ratings data to merge
    const { data: ratings, error: ratingsError } = await supabase
      .from('ratings')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    if (ratingsError) {
      console.error('Error fetching ratings:', ratingsError);
      return reviews || [];
    }

    // Merge reviews and ratings by user_ip
    const mergedData = [];
    const reviewsByUser = {};
    const ratingsByUser = {};

    // Index reviews by user_ip
    (reviews || []).forEach(review => {
      reviewsByUser[review.user_ip] = review;
    });

    // Index ratings by user_ip
    (ratings || []).forEach(rating => {
      ratingsByUser[rating.user_ip] = rating;
    });

    // Create merged entries
    const allUserIps = new Set([
      ...Object.keys(reviewsByUser),
      ...Object.keys(ratingsByUser)
    ]);

    allUserIps.forEach(userIp => {
      const review = reviewsByUser[userIp];
      const rating = ratingsByUser[userIp];

      mergedData.push({
        review_id: review?.review_id || `rating_${rating?.rating_id}`,
        restaurant_id: restaurantId,
        user_ip: userIp,
        reviewer_name: review?.reviewer_name || 'Anonymous',
        comment: review?.comment || null,
        rating: rating?.rating || null,
        images: review?.images || null,
        created_at: review?.created_at || rating?.created_at,
        updated_at: review?.updated_at || rating?.updated_at
      });
    });

    // Sort by created_at descending
    mergedData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return mergedData;

  } catch (error) {
    console.error('Error in getRestaurantReviews:', error);
    return [];
  }
};

// NEW: Add the missing fetchRestaurantDetail function that ShopDetail expects
export const fetchRestaurantDetail = async (restaurantId) => {
  return await getRestaurantById(restaurantId);
};

// Get all cuisines
export const getAllCuisines = async () => {
  try {
    const { data, error } = await supabase
      .from('cuisines')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching cuisines:', error);
      return [];
    }

    console.log('getAllCuisines result:', data);
    return data || [];

  } catch (error) {
    console.error('Error in getAllCuisines:', error);
    return [];
  }
};

// Get top rated restaurants
export const getTopRatedRestaurants = async (limit = 10) => {
  try {
    const restaurants = await getAllRestaurants();
    
    // Sort by rating and take top N
    const topRated = restaurants
      .filter(restaurant => restaurant.is_active)
      .sort((a, b) => {
        // First sort by rating, then by number of reviews as tiebreaker
        if (b.avg_rating !== a.avg_rating) {
          return b.avg_rating - a.avg_rating;
        }
        return b.total_reviews - a.total_reviews;
      })
      .slice(0, limit);

    console.log('getTopRatedRestaurants result:', topRated);
    return topRated;

  } catch (error) {
    console.error('Error in getTopRatedRestaurants:', error);
    return [];
  }
};

// Get restaurants by cuisine
export const getRestaurantsByCuisine = async (cuisineId) => {
  try {
    const { data, error } = await supabase
      .from('restaurant_cuisines')
      .select(`
        restaurants!inner(
          id,
          name,
          image_url,
          menu_images,
          description,
          phone,
          address,
          is_active
        ),
        cuisines(name)
      `)
      .eq('cuisine_id', cuisineId)
      .eq('restaurants.is_active', true);

    if (error) {
      console.error('Error fetching restaurants by cuisine:', error);
      return [];
    }

    if (!data) return [];

    // Get ratings for each restaurant
    const restaurantIds = data.map(item => item.restaurants.id);
    const ratingsData = await getRestaurantRatings(restaurantIds);

    const result = data.map(item => {
      const ratings = ratingsData[item.restaurants.id] || { avg_rating: 0, total_reviews: 0 };
      return {
        ...item.restaurants,
        avg_rating: ratings.avg_rating,
        total_reviews: ratings.total_reviews,
        cuisines: [{ name: item.cuisines.name }], // FIXED: return as cuisine object array
        // Add backward compatibility
        averageRating: ratings.avg_rating,
        totalRatings: ratings.total_reviews
      };
    });

    console.log('getRestaurantsByCuisine result:', result);
    return result;

  } catch (error) {
    console.error('Error in getRestaurantsByCuisine:', error);
    return [];
  }
};

// Search restaurants
export const searchRestaurants = async (query) => {
  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select(`
        *,
        restaurant_cuisines(
          cuisines(name)
        )
      `)
      .eq('is_active', true)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%,address.ilike.%${query}%`);

    if (error) {
      console.error('Error searching restaurants:', error);
      return [];
    }

    // Get ratings for found restaurants
    const restaurantIds = data?.map(restaurant => restaurant.id) || [];
    const ratingsData = await getRestaurantRatings(restaurantIds);

    const result = data?.map(restaurant => {
      const ratings = ratingsData[restaurant.id] || { avg_rating: 0, total_reviews: 0 };
      return {
        ...restaurant,
        avg_rating: ratings.avg_rating,
        total_reviews: ratings.total_reviews,
        cuisines: restaurant.restaurant_cuisines?.map(rc => rc.cuisines) || [], // FIXED: return cuisine objects
        // Add backward compatibility
        averageRating: ratings.avg_rating,
        totalRatings: ratings.total_reviews
      };
    }) || [];

    console.log('searchRestaurants result:', result);
    return result;

  } catch (error) {
    console.error('Error in searchRestaurants:', error);
    return [];
  }
};

// Get recent restaurants (most recently added)
export const getRecentRestaurants = async (limit = 5) => {
  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select(`
        *,
        restaurant_cuisines(
          cuisines(name)
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent restaurants:', error);
      return [];
    }

    // Get ratings for recent restaurants
    const restaurantIds = data?.map(restaurant => restaurant.id) || [];
    const ratingsData = await getRestaurantRatings(restaurantIds);

    const result = data?.map(restaurant => {
      const ratings = ratingsData[restaurant.id] || { avg_rating: 0, total_reviews: 0 };
      return {
        ...restaurant,
        avg_rating: ratings.avg_rating,
        total_reviews: ratings.total_reviews,
        cuisines: restaurant.restaurant_cuisines?.map(rc => rc.cuisines) || [], // FIXED: return cuisine objects
        // Add backward compatibility
        averageRating: ratings.avg_rating,
        totalRatings: ratings.total_reviews
      };
    }) || [];

    console.log('getRecentRestaurants result:', result);
    return result;

  } catch (error) {
    console.error('Error in getRecentRestaurants:', error);
    return [];
  }
};

// Get restaurant rating details
export const getRestaurantRatingDetails = async (restaurantId) => {
  try {
    const { data: ratings, error } = await supabase
      .from('ratings')
      .select('rating, created_at, user_ip')
      .eq('restaurant_id', restaurantId) // FIXED: changed from restraunt_id
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching rating details:', error);
      return {
        ratings: [],
        avg_rating: 0,
        total_reviews: 0,
        rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
    }

    if (!ratings || ratings.length === 0) {
      return {
        ratings: [],
        avg_rating: 0,
        total_reviews: 0,
        rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
    }

    const totalRatings = ratings.length;
    const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings;
    
    // Calculate rating distribution
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach(r => {
      distribution[r.rating] = (distribution[r.rating] || 0) + 1;
    });

    return {
      ratings,
      avg_rating: avgRating,
      total_reviews: totalRatings,
      rating_distribution: distribution
    };

  } catch (error) {
    console.error('Error in getRestaurantRatingDetails:', error);
    return {
      ratings: [],
      avg_rating: 0,
      total_reviews: 0,
      rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };
  }
};

// Add or update a rating
export const addOrUpdateRating = async (restaurantId, rating, userIp = 'anonymous') => {
  try {
    // Validate rating
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    const { data, error } = await supabase
      .from('ratings')
      .upsert({
        restaurant_id: restaurantId, // FIXED: changed from restraunt_id
        user_ip: userIp,
        rating: rating,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'restaurant_id,user_ip' // FIXED: changed from restraunt_id
      })
      .select();

    if (error) {
      console.error('Error adding/updating rating:', error);
      return { success: false, error: error.message };
    }

    console.log('Rating added/updated successfully:', data);
    return { success: true, data };

  } catch (error) {
    console.error('Error in addOrUpdateRating:', error);
    return { success: false, error: error.message };
  }
};

// Check if user has already rated a restaurant
export const getUserRating = async (restaurantId, userIp = 'anonymous') => {
  try {
    const { data, error } = await supabase
      .from('ratings')
      .select('rating, created_at, updated_at')
      .eq('restaurant_id', restaurantId) // FIXED: changed from restraunt_id
      .eq('user_ip', userIp)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
      console.error('Error fetching user rating:', error);
      return null;
    }

    return data;

  } catch (error) {
    console.error('Error in getUserRating:', error);
    return null;
  }
};

// NEW: Submit rating with review (what ShopDetail expects)
export const submitRating = async (restaurantId, rating, comment = '', reviewerName = '') => {
  try {
    const userIp = 'anonymous'; // You can implement IP detection later
    
    // Add rating
    const ratingResult = await addOrUpdateRating(restaurantId, rating, userIp);
    
    if (!ratingResult.success) {
      throw new Error(ratingResult.error);
    }

    // Add review if comment provided
    if (comment || reviewerName) {
      const { error: reviewError } = await supabase
        .from('reviews')
        .upsert({
          restaurant_id: restaurantId,
          user_ip: userIp,
          reviewer_name: reviewerName || 'Anonymous',
          comment: comment,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'restaurant_id,user_ip'
        });

      if (reviewError) {
        console.error('Error adding review:', reviewError);
        // Don't throw here - rating was successful
      }
    }

    return { success: true };

  } catch (error) {
    console.error('Error in submitRating:', error);
    throw error;
  }
};

// Refresh restaurant stats (you can create a function in Supabase to refresh the materialized view)
export const refreshRestaurantStats = async () => {
  try {
    // This would typically call a Supabase function to refresh the materialized view
    // For now, we'll just return success since we're calculating ratings on-demand
    console.log('Restaurant stats refresh requested - using live calculation');
    return { success: true };
  } catch (error) {
    console.error('Error refreshing restaurant stats:', error);
    return { success: false, error: error.message };
  }
};

// Get restaurant details (alias for getRestaurantById)
export const getRestaurantDetails = async (restaurantId) => {
  return await getRestaurantById(restaurantId);
};