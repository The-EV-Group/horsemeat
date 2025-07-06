
import { useState, useEffect } from 'react';
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchKeywords();
  }, [category]);

  const fetchKeywords = async () => {
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
  };

  const searchKeywords = async (searchTerm: string, category?: string) => {
    try {
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
      return data || [];
    } catch (err) {
      console.error('Error searching keywords:', err);
      return [];
    }
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
      return data;
    } catch (err) {
      console.error('Error creating keyword:', err);
      throw err;
    }
  };

  return {
    keywords,
    loading,
    error,
    searchKeywords,
    createKeyword,
    refetch: fetchKeywords,
  };
}
