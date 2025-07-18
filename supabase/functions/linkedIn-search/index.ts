import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

interface LinkedInProfile {
  title: string;
  link: string;
  snippet: string;
  displayLink: string;
  formattedUrl: string;
  name: string;
  keywords_matched: string[];
}

interface LinkedInSearchResult {
  profiles: LinkedInProfile[];
  search_query: string;
  categories: string[];
  total_results: number;
  error: string | null;
}

interface SearchFilters {
  skills: string[];
  industries: string[];
  companies: string[];
  certifications: string[];
  jobTitles: string[];
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get API keys from environment variables
    const API_KEY = Deno.env.get('GOOGLE_API_KEY') || 'AIzaSyDKBRtpsnuqpMVuao5tMp65BxfVUJWZN58';
    const CSE_ID = Deno.env.get('GOOGLE_CSE_ID') || 'c5d364eaef3874982';

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse request body
    const { filters, numResults = 10 }: { filters: SearchFilters; numResults?: number } = await req.json()

    // Build the search query from keywords
    const keywords = [
      ...filters.skills,
      ...filters.industries,
      ...filters.companies,
      ...filters.certifications,
      ...filters.jobTitles
    ];

    if (keywords.length === 0) {
      const result: LinkedInSearchResult = {
        profiles: [],
        search_query: '',
        categories: [],
        total_results: 0,
        error: 'No search keywords provided'
      };

      return new Response(
        JSON.stringify(result),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Combine keywords into a search query
    const query = keywords.join(' ');
    const searchUrl = 'https://www.googleapis.com/customsearch/v1';
    
    const params = new URLSearchParams({
      key: API_KEY,
      cx: CSE_ID,
      q: `site:linkedin.com/in ${query}`,
      num: Math.min(numResults, 10).toString()
    });

    console.log('Executing LinkedIn search with query:', query);

    // Make the API request to Google Custom Search
    const response = await fetch(`${searchUrl}?${params}`);
    
    if (!response.ok) {
      throw new Error(`Google API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Build categories for display
    const categories = [];
    if (filters.skills.length > 0) {
      categories.push(`Skills: ${filters.skills.join(', ')}`);
    }
    if (filters.industries.length > 0) {
      categories.push(`Industries: ${filters.industries.join(', ')}`);
    }
    if (filters.companies.length > 0) {
      categories.push(`Companies: ${filters.companies.join(', ')}`);
    }
    if (filters.certifications.length > 0) {
      categories.push(`Certifications: ${filters.certifications.join(', ')}`);
    }
    if (filters.jobTitles.length > 0) {
      categories.push(`Job Titles: ${filters.jobTitles.join(', ')}`);
    }

    if (!data.items || data.items.length === 0) {
      const result: LinkedInSearchResult = {
        profiles: [],
        search_query: query,
        categories,
        total_results: 0,
        error: null
      };

      return new Response(
        JSON.stringify(result),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Process the search results
    const profiles: LinkedInProfile[] = data.items.map((item: any) => {
      // Extract name from title (LinkedIn titles usually contain the person's name)
      let name = item.title || '';
      if (name.includes(' | ')) {
        name = name.split(' | ')[0].trim();
      } else if (name.includes(' - ')) {
        name = name.split(' - ')[0].trim();
      }

      return {
        title: item.title || '',
        link: item.link || '',
        snippet: item.snippet || '',
        displayLink: item.displayLink || '',
        formattedUrl: item.formattedUrl || '',
        name: name,
        keywords_matched: keywords
      };
    });

    const result: LinkedInSearchResult = {
      profiles,
      search_query: query,
      categories,
      total_results: profiles.length,
      error: null
    };

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error executing LinkedIn search:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    const result: LinkedInSearchResult = {
      profiles: [],
      search_query: '',
      categories: [],
      total_results: 0,
      error: errorMessage
    };

    return new Response(
      JSON.stringify(result),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
