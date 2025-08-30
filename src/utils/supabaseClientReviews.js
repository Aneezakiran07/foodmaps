// Supabase Client Configuration
// src/utils/supabaseClient.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // Since we're not using auth, disable session persistence
  },
});

// Optional: Add some helper functions for common operations
export const supabaseHelpers = {
  // Format Supabase timestamp for display
  formatTimestamp: (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  // Handle Supabase errors consistently
  handleError: (error) => {
    console.error('Supabase error:', error);
    
    if (error.code === 'PGRST116') {
      return 'No data found';
    }
    
    if (error.code === '23505') {
      return 'This record already exists';
    }
    
    return error.message || 'An unexpected error occurred';
  },

  // Check if Supabase is connected
  checkConnection: async () => {
    try {
      const { data, error } = await supabase
        .from('suggestions')
        .select('count', { count: 'exact' })
        .limit(1);
      
      return { connected: !error, error: error?.message };
    } catch (error) {
      return { connected: false, error: error.message };
    }
  }
};