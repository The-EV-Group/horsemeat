
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/integrations/supabase/types';

type Contractor = Tables<'contractor'>;
type Keyword = Tables<'keyword'>;

export interface SearchFilters {
  state?: string;
  city?: string;
  payType?: 'no-preference' | 'hourly' | 'salary';
  payMin?: number;
  payMax?: number;
  skills: Keyword[];
  industries: Keyword[];
  certifications: Keyword[];
  companies: Keyword[];
  jobTitles: Keyword[];
}

export function useContractorSearch() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchContractors = async (filters: SearchFilters) => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('contractor')
        .select('*');

      // Location filter
      if (filters.state) {
        query = query.eq('state', filters.state);
        if (filters.city) {
          query = query.eq('city', filters.city);
        }
      }

      // Pay filter
      if (filters.payType === 'hourly' && filters.payMin && filters.payMax) {
        query = query
          .eq('prefers_hourly', true)
          .gte('hourly_rate', filters.payMin)
          .lte('hourly_rate', filters.payMax);
      } else if (filters.payType === 'salary' && filters.payMin && filters.payMax) {
        query = query
          .eq('prefers_hourly', false)
          .gte('salary_lower', filters.payMin)
          .lte('salary_higher', filters.payMax);
      }

      const { data: baseContractors, error: contractorError } = await query;
      if (contractorError) throw contractorError;

      let filteredContractors = baseContractors || [];

      // Keyword filtering
      const allKeywords = [
        ...filters.skills,
        ...filters.industries,
        ...filters.certifications,
        ...filters.companies,
        ...filters.jobTitles
      ];

      if (allKeywords.length > 0) {
        const keywordIds = allKeywords.map(k => k.id);
        
        // Get contractors that have any of the selected keywords
        const { data: contractorKeywords, error: keywordError } = await supabase
          .from('contractor_keyword')
          .select('contractor_id')
          .in('keyword_id', keywordIds);

        if (keywordError) throw keywordError;

        const contractorIdsWithKeywords = new Set(
          contractorKeywords?.map(ck => ck.contractor_id) || []
        );

        filteredContractors = filteredContractors.filter(contractor =>
          contractorIdsWithKeywords.has(contractor.id)
        );
      }

      // Sort: star candidates first, then by name
      filteredContractors.sort((a, b) => {
        if (a.star_candidate && !b.star_candidate) return -1;
        if (!a.star_candidate && b.star_candidate) return 1;
        return (a.full_name || '').localeCompare(b.full_name || '');
      });

      setContractors(filteredContractors);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const updateContractor = async (id: string, updates: Partial<Contractor>) => {
    try {
      const { error } = await supabase
        .from('contractor')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setContractors(prev =>
        prev.map(contractor =>
          contractor.id === id ? { ...contractor, ...updates } : contractor
        )
      );
    } catch (err) {
      throw err;
    }
  };

  const deleteContractor = async (id: string) => {
    try {
      const { error } = await supabase
        .from('contractor')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setContractors(prev => prev.filter(contractor => contractor.id !== id));
    } catch (err) {
      throw err;
    }
  };

  return {
    contractors,
    loading,
    error,
    searchContractors,
    updateContractor,
    deleteContractor,
  };
}
