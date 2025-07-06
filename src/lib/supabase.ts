
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://rvpipfohtzpftehwrake.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2cGlwZm9odHpwZnRlaHdyYWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MjYzMDYsImV4cCI6MjA2NzQwMjMwNn0.6Xdivl91QgaQwzSwe_j2bWSFDfufrHUNSZ9rf80-XHA";

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
