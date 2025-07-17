import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/integrations/supabase/types';

type Keyword = Tables<'keyword'>;

// Extended keyword type with usage information
export interface KeywordWithUsage extends Keyword {
  is_linked: boolean;
  contractor_count: number;
}

// UI string ➜ database enum mapping - using singular forms to match what's in the database
const CATEGORY_MAP: Record<string, string> = {
  skills: 'skill',
  industries: 'industry',
  certifications: 'certification',
  companies: 'company',
  'job titles': 'job_title',
  'job-titles': 'job_title', // Support hyphenated version used in UI
};

// Also support direct mapping for exact matches
const CATEGORY_MAP_DIRECT: Record<string, string> = {
  skill: 'skill',
  industry: 'industry',
  certification: 'certification',
  company: 'company',
  'job_title': 'job_title',
};

function normalizeCategory(cat?: string): string | undefined {
  if (!cat) return undefined;
  return CATEGORY_MAP[cat] ?? CATEGORY_MAP_DIRECT[cat] ?? cat;
}

export function useKeywords(category?: string) {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [keywordsWithUsage, setKeywordsWithUsage] = useState<KeywordWithUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchCache = useRef<Record<string, Keyword[]>>({});
  const searchTimerRef = useRef<number | null>(null);

  // Use useCallback to prevent recreation on every render
  const fetchKeywords = useCallback(async () => {
    try {
      setLoading(true);
      const dbCategory = normalizeCategory(category);
      let query = supabase
        .from('keyword')
        .select('*')
        .order('name');

      if (dbCategory) {
        query = query.eq('category', dbCategory);
      }

      const { data, error } = await query;

      if (error) throw error;
      setKeywords(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [category]);

  // Fetch keywords with usage information (optimized version)
  const fetchKeywordsWithUsage = useCallback(async (categoryValue?: string) => {
    try {
      setLoading(true);
      const dbCategory = normalizeCategory(categoryValue || category);

      console.log('Fetching keywords with category:', categoryValue, 'normalized to:', dbCategory);

      // First, get all keywords for the category
      let keywordQuery = supabase
        .from('keyword')
        .select('*')
        .order('name');

      if (dbCategory) {
        keywordQuery = keywordQuery.eq('category', dbCategory);
      }

      console.log('Executing query:', keywordQuery);

      const { data: keywordsData, error: keywordsError } = await keywordQuery;

      console.log('Keywords query result:', keywordsData?.length || 0, 'keywords found');
      if (keywordsError) {
        console.error('Error fetching keywords:', keywordsError);
      }
      if (keywordsData && keywordsData.length > 0) {
        console.log('Sample keyword:', keywordsData[0]);
      }

      if (keywordsError) throw keywordsError;
      if (!keywordsData || keywordsData.length === 0) {
        setKeywordsWithUsage([]);
        return [];
      }

      // Get usage counts by counting contractor_keyword entries
      const keywordIds = keywordsData.map(k => k.id);

      // Get all contractor_keyword entries for these keywords
      const { data: allLinks, error: linkError } = await supabase
        .from('contractor_keyword')
        .select('keyword_id, contractor_id');
        
      if (linkError) {
        console.error('Error fetching keyword links:', linkError);
      }
      
      console.log(`Found ${allLinks?.length || 0} total links`);
      
      // Create a map of keyword ID to count
      const countMap: Record<string, number> = {};
      
      // Group by keyword_id and count unique contractor_ids
      if (allLinks && allLinks.length > 0) {
        // Create a map to track unique contractor IDs per keyword
        const keywordContractors: Record<string, Set<string>> = {};
        
        // Process all links
        allLinks.forEach(link => {
          if (!keywordContractors[link.keyword_id]) {
            keywordContractors[link.keyword_id] = new Set();
          }
          keywordContractors[link.keyword_id].add(link.contractor_id);
        });
        
        // Convert sets to counts
        Object.keys(keywordContractors).forEach(keywordId => {
          countMap[keywordId] = keywordContractors[keywordId].size;
        });
      }

      // Combine keyword data with usage counts
      const keywordsWithUsageData = keywordsData.map(keyword => ({
        ...keyword,
        is_linked: !!countMap[keyword.id],
        contractor_count: countMap[keyword.id] || 0
      }));

      setKeywordsWithUsage(keywordsWithUsageData);
      return keywordsWithUsageData;
    } catch (err) {
      console.error('Error fetching keywords with usage:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      return [];
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchKeywords();
    // Clean up any pending search timers
    return () => {
      if (searchTimerRef.current) {
        window.clearTimeout(searchTimerRef.current);
      }
    };
  }, [fetchKeywords]);

  const searchKeywords = async (searchTerm: string, category?: string) => {
    try {
      // Don't search for empty terms
      if (!searchTerm.trim()) {
        return [];
      }

      setSearchLoading(true);

      // Check cache first
      const cacheKey = `${category || 'all'}:${searchTerm.toLowerCase()}`;
      if (searchCache.current[cacheKey]) {
        setSearchLoading(false);
        return searchCache.current[cacheKey];
      }

      const dbCategory = normalizeCategory(category);
      let query = supabase
        .from('keyword')
        .select('*')
        .ilike('name', `%${searchTerm}%`)
        .order('name')
        .limit(10);

      if (dbCategory) {
        query = query.eq('category', dbCategory);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Cache the results
      const results = data || [];
      searchCache.current[cacheKey] = results;

      return results;
    } catch (err) {
      console.error('Error searching keywords:', err);
      return [];
    } finally {
      setSearchLoading(false);
    }
  };

  // Debounced search function
  const debouncedSearchKeywords = (searchTerm: string, category?: string, delay = 300) => {
    return new Promise<Keyword[]>((resolve) => {
      // Clear any existing timer
      if (searchTimerRef.current) {
        window.clearTimeout(searchTimerRef.current);
      }

      // Don't debounce empty searches, just return empty results immediately
      if (!searchTerm.trim()) {
        setSearchLoading(false);
        resolve([]);
        return;
      }

      setSearchLoading(true);

      // Set a new timer
      searchTimerRef.current = window.setTimeout(async () => {
        const results = await searchKeywords(searchTerm, category);
        resolve(results);
      }, delay);
    });
  };

  const createKeyword = async (name: string, category: string) => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Keyword cannot be empty');

    const dbCategory = normalizeCategory(category);

    try {
      // First, check if the keyword already exists
      const { data: existingKeyword, error: searchError } = await supabase
        .from('keyword')
        .select('*')
        .eq('name', trimmed)
        .eq('category', dbCategory)
        .single();

      if (searchError && searchError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        // Real error, not just "not found"
        throw searchError;
      }

      // If keyword exists, return it immediately
      if (existingKeyword) {
        console.log(`Keyword already exists: ${trimmed} (${dbCategory})`);
        return existingKeyword;
      }

      // If not found, create new keyword
      const { data: newKeyword, error: insertError } = await supabase
        .from('keyword')
        .insert({ name: trimmed, category: dbCategory })
        .select()
        .single();

      if (insertError) {
        // If there's a race condition and another client created the same keyword
        // between our check and insert, just fetch the existing one
        if (insertError.code === '23505') { // unique constraint violation
          const { data: conflictKeyword, error: refetchError } = await supabase
            .from('keyword')
            .select('*')
            .eq('name', trimmed)
            .eq('category', dbCategory)
            .single();

          if (refetchError) throw refetchError;
          console.log(`Keyword already created by another process: ${trimmed} (${dbCategory})`);
          return conflictKeyword;
        }

        throw insertError;
      }

      // Update local state with the new keyword
      setKeywords(prev => [...prev, newKeyword]);

      // Clear cache as we've added a new keyword
      searchCache.current = {};

      console.log(`Created new keyword: ${trimmed} (${dbCategory})`);
      return newKeyword;
    } catch (err) {
      console.error(`Error creating keyword ${trimmed}:`, err);
      throw err;
    }
  };

  return {
    keywords,
    keywordsWithUsage,
    loading,
    searchLoading,
    error,
    searchKeywords: debouncedSearchKeywords,  // Use the debounced version
    createKeyword,
    refetch: fetchKeywords,
    fetchKeywordsWithUsage,  // Expose the optimized function
  };
}