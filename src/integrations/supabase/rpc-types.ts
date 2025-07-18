// Type definitions for custom RPC functions
import { SupabaseClient } from '@supabase/supabase-js';

// Extend the SupabaseClient with our custom RPC functions
declare module '@supabase/supabase-js' {
  interface SupabaseClient {
    rpc(
      fn: 'get_keyword_usage',
      params?: Record<string, unknown>,
      options?: Record<string, unknown>
    ): Promise<{
      data: Array<{
        keyword_id: string;
        contractor_count: number;
      }> | null;
      error: Error | null;
    }>;
    
    // Add other RPC functions here as needed
  }
}
