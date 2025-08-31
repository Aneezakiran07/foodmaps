// utils/supabaseSuggestions.js - COMPLETE UPDATED version with user management features
import { supabase } from './supabaseClient';

class SupabaseSuggestions {
  // Generate a consistent user identifier for anonymous users
  static userIdentifier = null;
  
  static getUserIdentifier() {
    if (!this.userIdentifier) {
      // Create a consistent identifier based on browser fingerprint
      const fingerprint = navigator.userAgent + navigator.language + screen.width + screen.height + navigator.platform;
      this.userIdentifier = 'user_' + btoa(fingerprint).replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
      console.log('Generated user identifier:', this.userIdentifier);
    }
    
    return this.userIdentifier;
  }

  // Add a new suggestion
  static async addSuggestion(suggestionData) {
    try {
      console.log('Adding suggestion:', suggestionData);

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
        user_identifier: this.getUserIdentifier(),
        user_name: suggestionData.userName?.trim() || null,
        user_email: suggestionData.userEmail?.trim() || null
      };

      console.log('Inserting into database:', dbData);

      const { data, error } = await supabase
        .from('suggestions')
        .insert([dbData])
        .select();

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log('Successfully added suggestion:', data);
      return { success: true, data: data[0] };

    } catch (error) {
      console.error('Error in addSuggestion:', error);
      return { success: false, error: error.message };
    }
  }

  // Update an existing suggestion
  static async updateSuggestion(suggestionId, suggestionData) {
    try {
      console.log('Updating suggestion:', { suggestionId, suggestionData });

      const userIdentifier = this.getUserIdentifier();

      // First verify the user owns this suggestion
      const { data: existingSuggestion, error: fetchError } = await supabase
        .from('suggestions')
        .select('user_identifier, images')
        .eq('id', suggestionId)
        .single();

      if (fetchError) {
        console.error('Error fetching suggestion:', fetchError);
        throw new Error('Failed to find suggestion');
      }

      if (existingSuggestion.user_identifier !== userIdentifier) {
        throw new Error('You can only edit your own suggestions');
      }

      // Upload new images if any
      let imageUrls = existingSuggestion.images || [];
      if (suggestionData.images && suggestionData.images.length > 0) {
        const CloudinaryService = (await import('./cloudinaryService')).default;
        
        // Replace all images with new ones
        imageUrls = [];
        for (const image of suggestionData.images) {
          const uploadResult = await CloudinaryService.uploadImage(image);
          if (uploadResult.success) {
            imageUrls.push(uploadResult.url);
          } else {
            throw new Error(`Failed to upload image: ${uploadResult.error}`);
          }
        }
      }

      // Prepare update data
      const updateData = {
        title: suggestionData.title.trim(),
        content: suggestionData.content.trim(),
        type: suggestionData.type,
        restaurant_name: suggestionData.restaurantName?.trim() || null,
        food_item: suggestionData.foodItem?.trim() || null,
        images: imageUrls,
        user_name: suggestionData.userName?.trim() || null,
        user_email: suggestionData.userEmail?.trim() || null,
        updated_at: new Date().toISOString()
      };

      console.log('Updating in database:', updateData);

      const { data, error } = await supabase
        .from('suggestions')
        .update(updateData)
        .eq('id', suggestionId)
        .eq('user_identifier', userIdentifier)
        .select();

      if (error) {
        console.error('Database update error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('No suggestion was updated. You may not have permission to edit this suggestion.');
      }

      console.log('Successfully updated suggestion:', data[0]);
      return { success: true, data: data[0] };

    } catch (error) {
      console.error('Error in updateSuggestion:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete a suggestion
  static async deleteSuggestion(suggestionId) {
    try {
      console.log('Deleting suggestion:', suggestionId);

      const userIdentifier = this.getUserIdentifier();

      const { data, error } = await supabase
        .from('suggestions')
        .delete()
        .eq('id', suggestionId)
        .eq('user_identifier', userIdentifier)
        .select();

      if (error) {
        console.error('Database delete error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('No suggestion was deleted. You may not have permission to delete this suggestion.');
      }

      console.log('Successfully deleted suggestion');
      return { success: true };

    } catch (error) {
      console.error('Error in deleteSuggestion:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user's own suggestions
  static async getUserSuggestions() {
    try {
      console.log('Fetching user suggestions');
      
      const userIdentifier = this.getUserIdentifier();

      const { data: suggestions, error } = await supabase
        .from('suggestions')
        .select('*')
        .eq('user_identifier', userIdentifier)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      // Process the suggestions to include canEdit flag
      const processedSuggestions = suggestions.map(suggestion => ({
        ...suggestion,
        likes: Number(suggestion.likes) || 0,
        dislikes: Number(suggestion.dislikes) || 0,
        canEdit: true // User can always edit their own suggestions
      }));

      console.log('Successfully fetched user suggestions:', processedSuggestions.length);

      return {
        success: true,
        suggestions: processedSuggestions
      };

    } catch (error) {
      console.error('Error in getUserSuggestions:', error);
      return {
        success: false,
        error: error.message,
        suggestions: []
      };
    }
  }

  // Get suggestions with user reactions - now includes canEdit flag
  static async getSuggestionsWithUserReactions(page = 1, limit = 10, filter = 'all', searchQuery = '') {
    try {
      console.log('Fetching suggestions:', { page, limit, filter, searchQuery });
      
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
        console.error('Database error:', error);
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
          console.error('Error fetching user reactions:', reactionError);
        } else {
          userReactions = data || [];
        }
      }

      console.log('User reactions found:', userReactions?.length || 0, 'for user:', userIdentifier);

      // Process the suggestions to include user reactions and edit permissions
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
          userReaction: userReaction?.reaction_type || null,
          // Check if user can edit this suggestion
          canEdit: suggestion.user_identifier === userIdentifier
        };
      });

      const totalPages = Math.ceil(count / limit);

      console.log('Successfully fetched suggestions:', {
        count: suggestions.length,
        total: count,
        totalPages,
        userReactions: userReactions?.length || 0,
        userEditableCount: processedSuggestions.filter(s => s.canEdit).length,
        firstSuggestion: processedSuggestions[0] ? {
          id: processedSuggestions[0].id,
          likes: processedSuggestions[0].likes,
          dislikes: processedSuggestions[0].dislikes,
          userReaction: processedSuggestions[0].userReaction,
          canEdit: processedSuggestions[0].canEdit
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
      console.error('Error in getSuggestionsWithUserReactions:', error);
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

  // Toggle reaction using database function
  static async toggleReaction(suggestionId, reactionType) {
    try {
      console.log('Toggling reaction:', { suggestionId, reactionType });
      
      const userIdentifier = this.getUserIdentifier();
      console.log('User identifier for reaction:', userIdentifier);

      // Use the database function instead of manual operations
      const { data, error } = await supabase.rpc('toggle_suggestion_reaction', {
        p_suggestion_id: suggestionId,
        p_user_identifier: userIdentifier,
        p_reaction_type: reactionType
      });

      if (error) {
        console.error('Database function error:', error);
        throw error;
      }

      console.log('Database function result:', data);

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
      console.error('Error in toggleReaction:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get suggestions for a specific restaurant
  static async getSuggestionsForRestaurant(restaurantName, page = 1, limit = 10) {
    try {
      console.log('Fetching suggestions for restaurant:', restaurantName);
      
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
        console.error('Database error:', error);
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
          userReaction: userReaction?.reaction_type || null,
          canEdit: suggestion.user_identifier === userIdentifier
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
      console.error('Error in getSuggestionsForRestaurant:', error);
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

  // Get popular suggestions (most liked)
  static async getPopularSuggestions(limit = 10) {
    try {
      console.log('Fetching popular suggestions');
      
      const userIdentifier = this.getUserIdentifier();

      // Get suggestions ordered by likes
      const { data: suggestions, error } = await supabase
        .from('suggestions')
        .select('*')
        .order('likes', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Database error:', error);
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
          userReaction: userReaction?.reaction_type || null,
          canEdit: suggestion.user_identifier === userIdentifier
        };
      });

      return {
        success: true,
        suggestions: processedSuggestions
      };

    } catch (error) {
      console.error('Error in getPopularSuggestions:', error);
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
      console.log('Debugging suggestion:', suggestionId);
      
      // Get suggestion data
      const { data: suggestion, error: suggestionError } = await supabase
        .from('suggestions')
        .select('*')
        .eq('id', suggestionId)
        .single();

      if (suggestionError) {
        console.error('Error fetching suggestion:', suggestionError);
        return;
      }

      // Get reaction data
      const { data: reactions, error: reactionsError } = await supabase
        .from('suggestion_reactions')
        .select('*')
        .eq('suggestion_id', suggestionId);

      if (reactionsError) {
        console.error('Error fetching reactions:', reactionsError);
        return;
      }

      console.log('Suggestion debug data:', {
        suggestion,
        reactions,
        userIdentifier: this.getUserIdentifier()
      });

      return { suggestion, reactions };

    } catch (error) {
      console.error('Error in debugSuggestion:', error);
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

  // Check if user can edit a specific suggestion
  static async canEditSuggestion(suggestionId) {
    try {
      const userIdentifier = this.getUserIdentifier();
      
      const { data, error } = await supabase
        .from('suggestions')
        .select('user_identifier')
        .eq('id', suggestionId)
        .single();

      if (error) {
        console.error('Error checking edit permission:', error);
        return false;
      }

      return data.user_identifier === userIdentifier;
    } catch (error) {
      console.error('Error in canEditSuggestion:', error);
      return false;
    }
  }

  // Get suggestions count for a user
  static async getUserSuggestionsCount() {
    try {
      const userIdentifier = this.getUserIdentifier();
      
      const { count, error } = await supabase
        .from('suggestions')
        .select('*', { count: 'exact', head: true })
        .eq('user_identifier', userIdentifier);

      if (error) {
        console.error('Error getting user suggestions count:', error);
        return 0;
      }

      return count;
    } catch (error) {
      console.error('Error in getUserSuggestionsCount:', error);
      return 0;
    }
  }

  // Get user statistics
  static async getUserStats() {
    try {
      const userIdentifier = this.getUserIdentifier();
      
      // Get user's suggestions with their like/dislike counts
      const { data: suggestions, error } = await supabase
        .from('suggestions')
        .select('likes, dislikes, type')
        .eq('user_identifier', userIdentifier);

      if (error) {
        console.error('Error fetching user stats:', error);
        return {
          success: false,
          error: error.message
        };
      }

      // Calculate stats
      const stats = {
        totalSuggestions: suggestions.length,
        totalSuggestionType: suggestions.filter(s => s.type === 'suggestion').length,
        totalComplaintType: suggestions.filter(s => s.type === 'complaint').length,
        totalLikes: suggestions.reduce((sum, s) => sum + (Number(s.likes) || 0), 0),
        totalDislikes: suggestions.reduce((sum, s) => sum + (Number(s.dislikes) || 0), 0),
        avgLikes: suggestions.length > 0 ? 
          Math.round((suggestions.reduce((sum, s) => sum + (Number(s.likes) || 0), 0) / suggestions.length) * 10) / 10 : 0,
        avgDislikes: suggestions.length > 0 ? 
          Math.round((suggestions.reduce((sum, s) => sum + (Number(s.dislikes) || 0), 0) / suggestions.length) * 10) / 10 : 0
      };

      return {
        success: true,
        stats
      };

    } catch (error) {
      console.error('Error in getUserStats:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default SupabaseSuggestions;