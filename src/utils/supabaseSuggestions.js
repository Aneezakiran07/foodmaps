// utils/supabaseSuggestions.js - FIXED for proper likes/dislikes display
import { supabase } from './supabaseClient';

class SupabaseSuggestions {
  // Generate a consistent user identifier for anonymous users
  static userIdentifier = null;
  
  static getUserIdentifier() {
    if (!this.userIdentifier) {
      // Create a consistent identifier based on browser fingerprint
      const fingerprint = navigator.userAgent + navigator.language + screen.width + screen.height + navigator.platform;
      this.userIdentifier = 'user_' + btoa(fingerprint).replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
      console.log('🆔 Generated user identifier:', this.userIdentifier);
    }
    
    return this.userIdentifier;
  }

  // Add a new suggestion
  static async addSuggestion(suggestionData) {
    try {
      console.log('🚀 Adding suggestion:', suggestionData);

      // Upload images first if any
      let imageUrls = [];
      if (suggestionData.images && suggestionData.images.length > 0) {
        const CloudinaryService = (await import('./cloudinaryService')).default;
        
        for (const image of suggestionData.images) {
          const uploadResult = await CloudinaryService.uploadImage(image);
          if (uploadResult.success) {
            imageUrls.push(uploadResult.url);
          } else {
            throw new Error(`Failed to upload image: ${uploadResult.error}`);
          }
        }
      }

      // Prepare data for database
      const dbData = {
        title: suggestionData.title.trim(),
        content: suggestionData.content.trim(),
        type: suggestionData.type,
        restaurant_name: suggestionData.restaurantName?.trim() || null,
        food_item: suggestionData.foodItem?.trim() || null,
        images: imageUrls,
        
      };

      console.log('💾 Inserting into database:', dbData);

      const { data, error } = await supabase
        .from('suggestions')
        .insert([dbData])
        .select();

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }

      console.log('✅ Successfully added suggestion:', data);
      return { success: true, data: data[0] };

    } catch (error) {
      console.error('💥 Error in addSuggestion:', error);
      return { success: false, error: error.message };
    }
  }

  // FIXED: Get suggestions with user reactions - proper data fetching
  static async getSuggestionsWithUserReactions(page = 1, limit = 10, filter = 'all', searchQuery = '') {
    try {
      console.log('🔍 Fetching suggestions:', { page, limit, filter, searchQuery });
      
      const userIdentifier = this.getUserIdentifier();
      const offset = (page - 1) * limit;

      // Build the base query
      let query = supabase
        .from('suggestions')
        .select('*'); // Get all suggestion fields including likes and dislikes

      // Apply filters
      if (filter !== 'all') {
        query = query.eq('type', filter);
      }

      // Apply search
      if (searchQuery && searchQuery.trim()) {
        const searchTerm = searchQuery.trim();
        query = query.or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%,restaurant_name.ilike.%${searchTerm}%,food_item.ilike.%${searchTerm}%`);
      }

      // Get total count for pagination
      const countQuery = supabase.from('suggestions').select('*', { count: 'exact', head: true });
      
      if (filter !== 'all') {
        countQuery.eq('type', filter);
      }
      
      if (searchQuery && searchQuery.trim()) {
        const searchTerm = searchQuery.trim();
        countQuery.or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%,restaurant_name.ilike.%${searchTerm}%,food_item.ilike.%${searchTerm}%`);
      }

      const { count } = await countQuery;

      // Get paginated results
      const { data: suggestions, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }

      // Get user reactions for these specific suggestions
      const suggestionIds = suggestions.map(s => s.id);
      let userReactions = [];
      
      if (suggestionIds.length > 0) {
        const { data, error: reactionError } = await supabase
          .from('suggestion_reactions')
          .select('suggestion_id, reaction_type')
          .eq('user_identifier', userIdentifier)
          .in('suggestion_id', suggestionIds);

        if (reactionError) {
          console.error('❌ Error fetching user reactions:', reactionError);
        } else {
          userReactions = data || [];
        }
      }

      console.log('👤 User reactions found:', userReactions?.length || 0, 'for user:', userIdentifier);

      // Process the suggestions to include user reactions
      const processedSuggestions = suggestions.map(suggestion => {
        // Find user's reaction for this suggestion
        const userReaction = userReactions?.find(
          reaction => reaction.suggestion_id === suggestion.id
        );

        return {
          ...suggestion,
          // Ensure likes/dislikes are numbers and default to 0
          likes: Number(suggestion.likes) || 0,
          dislikes: Number(suggestion.dislikes) || 0,
          userReaction: userReaction?.reaction_type || null
        };
      });

      const totalPages = Math.ceil(count / limit);

      console.log('✅ Successfully fetched suggestions:', {
        count: suggestions.length,
        total: count,
        totalPages,
        userReactions: userReactions?.length || 0,
        firstSuggestion: processedSuggestions[0] ? {
          id: processedSuggestions[0].id,
          likes: processedSuggestions[0].likes,
          dislikes: processedSuggestions[0].dislikes,
          userReaction: processedSuggestions[0].userReaction
        } : null
      });

      return {
        success: true,
        suggestions: processedSuggestions,
        totalPages,
        currentPage: page,
        totalItems: count
      };

    } catch (error) {
      console.error('💥 Error in getSuggestionsWithUserReactions:', error);
      return {
        success: false,
        error: error.message,
        suggestions: [],
        totalPages: 1,
        currentPage: page,
        totalItems: 0
      };
    }
  }

// Updated toggleReaction method using database function
static async toggleReaction(suggestionId, reactionType) {
  try {
    console.log('👍 Toggling reaction:', { suggestionId, reactionType });
    
    const userIdentifier = this.getUserIdentifier();
    console.log('🆔 User identifier for reaction:', userIdentifier);

    // Use the database function instead of manual operations
    const { data, error } = await supabase.rpc('toggle_suggestion_reaction', {
      p_suggestion_id: suggestionId,
      p_user_identifier: userIdentifier,
      p_reaction_type: reactionType
    });

    if (error) {
      console.error('❌ Database function error:', error);
      throw error;
    }

    console.log('✅ Database function result:', data);

    return {
      success: true,
      action: data.reaction_type ? 'added/updated' : 'removed',
      reactionType: data.reaction_type,
      updatedCounts: {
        likes: data.likes,
        dislikes: data.dislikes
      }
    };

  } catch (error) {
    console.error('💥 Error in toggleReaction:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

  // Get suggestions for a specific restaurant - FIXED
  static async getSuggestionsForRestaurant(restaurantName, page = 1, limit = 10) {
    try {
      console.log('🏪 Fetching suggestions for restaurant:', restaurantName);
      
      const userIdentifier = this.getUserIdentifier();
      const offset = (page - 1) * limit;

      // Get suggestions for this restaurant
      const query = supabase
        .from('suggestions')
        .select('*')
        .eq('restaurant_name', restaurantName);

      // Get total count
      const { count } = await supabase
        .from('suggestions')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_name', restaurantName);

      // Get paginated results
      const { data: suggestions, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }

      // Get user reactions for these suggestions
      const suggestionIds = suggestions.map(s => s.id);
      let userReactions = [];
      
      if (suggestionIds.length > 0) {
        const { data, error: reactionError } = await supabase
          .from('suggestion_reactions')
          .select('suggestion_id, reaction_type')
          .eq('user_identifier', userIdentifier)
          .in('suggestion_id', suggestionIds);

        if (!reactionError) {
          userReactions = data || [];
        }
      }

      // Process the data
      const processedSuggestions = suggestions.map(suggestion => {
        const userReaction = userReactions?.find(
          reaction => reaction.suggestion_id === suggestion.id
        );

        return {
          ...suggestion,
          likes: Number(suggestion.likes) || 0,
          dislikes: Number(suggestion.dislikes) || 0,
          userReaction: userReaction?.reaction_type || null
        };
      });

      const totalPages = Math.ceil(count / limit);

      return {
        success: true,
        suggestions: processedSuggestions,
        totalPages,
        currentPage: page,
        totalItems: count
      };

    } catch (error) {
      console.error('💥 Error in getSuggestionsForRestaurant:', error);
      return {
        success: false,
        error: error.message,
        suggestions: [],
        totalPages: 1,
        currentPage: page,
        totalItems: 0
      };
    }
  }

  // Get popular suggestions (most liked) - FIXED
  static async getPopularSuggestions(limit = 10) {
    try {
      console.log('🔥 Fetching popular suggestions');
      
      const userIdentifier = this.getUserIdentifier();

      // Get suggestions ordered by likes
      const { data: suggestions, error } = await supabase
        .from('suggestions')
        .select('*')
        .order('likes', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }

      // Get user reactions for these suggestions
      const suggestionIds = suggestions.map(s => s.id);
      let userReactions = [];
      
      if (suggestionIds.length > 0) {
        const { data, error: reactionError } = await supabase
          .from('suggestion_reactions')
          .select('suggestion_id, reaction_type')
          .eq('user_identifier', userIdentifier)
          .in('suggestion_id', suggestionIds);

        if (!reactionError) {
          userReactions = data || [];
        }
      }

      // Process the data
      const processedSuggestions = suggestions.map(suggestion => {
        const userReaction = userReactions?.find(
          reaction => reaction.suggestion_id === suggestion.id
        );

        return {
          ...suggestion,
          likes: Number(suggestion.likes) || 0,
          dislikes: Number(suggestion.dislikes) || 0,
          userReaction: userReaction?.reaction_type || null
        };
      });

      return {
        success: true,
        suggestions: processedSuggestions
      };

    } catch (error) {
      console.error('💥 Error in getPopularSuggestions:', error);
      return {
        success: false,
        error: error.message,
        suggestions: []
      };
    }
  }

  // Debug function to check suggestion data
  static async debugSuggestion(suggestionId) {
    try {
      console.log('🔍 Debugging suggestion:', suggestionId);
      
      // Get suggestion data
      const { data: suggestion, error: suggestionError } = await supabase
        .from('suggestions')
        .select('*')
        .eq('id', suggestionId)
        .single();

      if (suggestionError) {
        console.error('❌ Error fetching suggestion:', suggestionError);
        return;
      }

      // Get reaction data
      const { data: reactions, error: reactionsError } = await supabase
        .from('suggestion_reactions')
        .select('*')
        .eq('suggestion_id', suggestionId);

      if (reactionsError) {
        console.error('❌ Error fetching reactions:', reactionsError);
        return;
      }

      console.log('📊 Suggestion debug data:', {
        suggestion,
        reactions,
        userIdentifier: this.getUserIdentifier()
      });

      return { suggestion, reactions };

    } catch (error) {
      console.error('💥 Error in debugSuggestion:', error);
    }
  }

  // Get restaurant suggestions specifically
  static async getRestaurantSuggestions(page = 1, limit = 10) {
    return this.getSuggestionsWithUserReactions(page, limit, 'suggestion');
  }

  // Get complaint suggestions specifically
  static async getComplaintSuggestions(page = 1, limit = 10) {
    return this.getSuggestionsWithUserReactions(page, limit, 'complaint');
  }

  // Add a restaurant suggestion
  static async addRestaurantSuggestion(restaurantData) {
    return this.addSuggestion({
      ...restaurantData,
      type: 'suggestion'
    });
  }

  // Add a complaint
  static async addComplaint(complaintData) {
    return this.addSuggestion({
      ...complaintData,
      type: 'complaint'
    });
  }
}

export default SupabaseSuggestions;