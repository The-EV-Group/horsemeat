import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/integrations/supabase/types';

type Keyword = Tables<'keyword'>;

// UI string ➜ database enum mapping
const CATEGORY_MAP: Record<string, string> = {
  skills: 'skill',
  industries: 'industry',
  certifications: 'certification',
  companies: 'company',
  'job titles': 'job_title',
};

function normalizeCategory(cat?: string): string | undefined {
  if (!cat) return undefined;
  return CATEGORY_MAP[cat] ?? cat;
}

export function useKeywords(category?: string) {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
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
      const { data, error } = await supabase
        .from('keyword')
        .insert({ name: trimmed, category: dbCategory })
        .select()
        .single();

      if (error) throw error;
      
      // Update local state
      setKeywords(prev => [...prev, data]);
      
      // Clear cache as we've added a new keyword
      searchCache.current = {};
      
      return data;
    } catch (err) {
      console.error('Error creating keyword:', err);
      throw err;
    }
  };

  return {
    keywords,
    loading,
    searchLoading,
    error,
    searchKeywords: debouncedSearchKeywords,  // Use the debounced version
    createKeyword,
    refetch: fetchKeywords,
  };
}