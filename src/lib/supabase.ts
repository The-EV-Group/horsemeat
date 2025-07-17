
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// Get Supabase credentials from environment variables
// Handle both Vite and Node.js environments
let supabaseUrl: string;
let supabaseAnonKey: string;
let supabaseServiceRoleKey: string | undefined;

// Check if we're in a browser environment (Vite)
if (typeof window !== 'undefined' && import.meta && import.meta.env) {
  supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  // Service role key should not be exposed in browser environment
} else {
  // Node.js environment
  supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
  supabaseServiceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
}

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Create Supabase client with appropriate storage based on environment
const createStorage = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    // Browser environment
    return {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    };
  } else {
    // Node.js environment
    return {
      persistSession: false,
    };
  }
};

// Regular client for normal operations
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: createStorage(),
});

// Admin client with service role for operations that need elevated permissions
// Only available in Node.js environment
export const supabaseAdmin = typeof window === 'undefined' && supabaseServiceRoleKey
  ? createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    })
  : null;
