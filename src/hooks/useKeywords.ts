
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/integrations/supabase/types';

type Keyword = Tables<'keyword'>;

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
      let query = supabase
        .from('keyword')
        .select('*')
        .order('name');

      if (category) {
        query = query.eq('category', category);
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
      let query = supabase
        .from('keyword')
        .select('*')
        .ilike('name', `%${searchTerm}%`)
        .order('name')
        .limit(10);

      if (category) {
        query = query.eq('category', category);
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
    try {
      const { data, error } = await supabase
        .from('keyword')
        .insert({ name: name.trim(), category })
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
