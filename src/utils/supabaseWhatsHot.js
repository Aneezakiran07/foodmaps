import { supabase } from './supabaseClient';

export class SupabaseWhatsHot {
  // Get all posts, ordered by newest first
  static async getAllPosts() {
    try {
      const { data, error } = await supabase
        .from('whats_hot')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching posts:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllPosts:', error);
      throw error;
    }
  }

  // Get posts filtered by type
  static async getPostsByType(type) {
    try {
      const { data, error } = await supabase
        .from('whats_hot')
        .select('*')
        .eq('type', type)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching posts by type:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getPostsByType:', error);
      throw error;
    }
  }

  // Get recent posts (last 7 days)
  static async getRecentPosts() {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('whats_hot')
        .select('*')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching recent posts:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getRecentPosts:', error);
      throw error;
    }
  }

  // Get post by ID
  static async getPostById(postId) {
    try {
      const { data, error } = await supabase
        .from('whats_hot')
        .select('*')
        .eq('id', postId)
        .single();

      if (error) {
        console.error('Error fetching post by ID:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getPostById:', error);
      throw error;
    }
  }

  // Admin functions (for future use)
  static async addPost(postData) {
    try {
      const { data, error } = await supabase
        .from('whats_hot')
        .insert([{
          title: postData.title,
          description: postData.description,
          images: postData.images || [],
          type: postData.type
        }])
        .select()
        .single();

      if (error) {
        console.error('Error adding post:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in addPost:', error);
      throw error;
    }
  }

  static async updatePost(postId, postData) {
    try {
      const { data, error } = await supabase
        .from('whats_hot')
        .update({
          title: postData.title,
          description: postData.description,
          images: postData.images || [],
          type: postData.type,
          updated_at: new Date().toISOString()
        })
        .eq('id', postId)
        .select()
        .single();

      if (error) {
        console.error('Error updating post:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in updatePost:', error);
      throw error;
    }
  }

  static async deletePost(postId) {
    try {
      const { error } = await supabase
        .from('whats_hot')
        .delete()
        .eq('id', postId);

      if (error) {
        console.error('Error deleting post:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in deletePost:', error);
      throw error;
    }
  }

  // Get posts count by type (for filter badges)
  static async getPostsCountByType() {
    try {
      const { data, error } = await supabase
        .from('whats_hot')
        .select('type')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching posts count:', error);
        throw error;
      }

      const counts = {
        all: data.length,
        deal: 0,
        new_opening: 0,
        discount: 0,
        event: 0
      };

      data.forEach(post => {
        if (counts.hasOwnProperty(post.type)) {
          counts[post.type]++;
        }
      });

      return counts;
    } catch (error) {
      console.error('Error in getPostsCountByType:', error);
      return {
        all: 0,
        deal: 0,
        new_opening: 0,
        discount: 0,
        event: 0
      };
    }
  }
}