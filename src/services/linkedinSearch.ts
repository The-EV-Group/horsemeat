import { supabase } from '@/lib/supabase';

export interface LinkedInProfile {
  title: string;
  link: string;
  snippet: string;
  displayLink: string;
  formattedUrl: string;
  name: string;
  keywords_matched: string[];
}

export interface LinkedInSearchResult {
  profiles: LinkedInProfile[];
  search_query: string;
  categories: string[];
  total_results: number;
  error: string | null;
}

export interface SearchFilters {
  skills: string[];
  industries: string[];
  companies: string[];
  certifications: string[];
  jobTitles: string[];
}

export class LinkedInSearchService {
  /**
   * Search LinkedIn profiles using the Supabase Edge Function
   */
  static async searchProfiles(filters: SearchFilters, numResults: number = 10): Promise<LinkedInSearchResult> {
    try {
      console.log('Calling LinkedIn search Edge Function with filters:', filters);

      // Call the Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('linkedIn-search', {
        body: {
          filters,
          numResults
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(`Function call failed: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data returned from function');
      }

      console.log('LinkedIn search completed:', data);
      return data as LinkedInSearchResult;

    } catch (error) {
      console.error('Error executing LinkedIn search:', error);
      
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        profiles: [],
        search_query: '',
        categories: [],
        total_results: 0,
        error: errorMessage
      };
    }
  }

  /**
   * Test if the Supabase Edge Function is accessible
   */
  static async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // Test with minimal filters
      const testFilters: SearchFilters = {
        skills: ['test'],
        industries: [],
        companies: [],
        certifications: [],
        jobTitles: []
      };

      const result = await this.searchProfiles(testFilters, 1);
      
      if (result.error) {
        return { success: false, error: result.error };
      }

      return { success: true };
    } catch (error) {
      console.error('LinkedIn search test failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
