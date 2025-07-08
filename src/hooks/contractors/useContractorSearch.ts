import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/integrations/supabase/types';

type Contractor = Tables<'contractor'>;

export interface SearchFilters {
  searchTerm?: string;
  available?: boolean | null;
  starCandidate?: boolean | null;
  payType?: string | null;
  state?: string;
  city?: string;
  payMin?: number;
  payMax?: number;
  skills: Keyword[];
  industries: Keyword[];
  companies: Keyword[];
  certifications: Keyword[];
  jobTitles: Keyword[];
}

type Keyword = Tables<'keyword'>;

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
        .select('*')
        .order('inserted_at', { ascending: false });

      // Apply text search
      if (filters.searchTerm) {
        query = query.or(`full_name.ilike.%${filters.searchTerm}%,email.ilike.%${filters.searchTerm}%,phone.ilike.%${filters.searchTerm}%`);
      }

      // Apply boolean filters
      if (filters.available !== null) {
        query = query.eq('available', filters.available);
      }

      if (filters.starCandidate !== null) {
        query = query.eq('star_candidate', filters.starCandidate);
      }

      // Apply pay type filter
      if (filters.payType) {
        query = query.eq('pay_type', filters.payType);
      }

      // Apply state filter
      if (filters.state) {
        query = query.eq('state', filters.state);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filter by keywords if any are selected
      const allKeywords = [
        ...filters.skills.map(k => k.id),
        ...filters.industries.map(k => k.id),
        ...filters.companies.map(k => k.id),
        ...filters.certifications.map(k => k.id),
        ...filters.jobTitles.map(k => k.id)
      ];

      if (allKeywords.length > 0) {
        // Get contractors that have any of the selected keywords
        const { data: contractorKeywords, error: keywordError } = await supabase
          .from('contractor_keyword')
          .select('contractor_id')
          .in('keyword_id', allKeywords);

        if (keywordError) throw keywordError;

        const contractorIds = contractorKeywords?.map(ck => ck.contractor_id) || [];
        const filteredData = data?.filter(contractor => contractorIds.includes(contractor.id)) || [];
        setContractors(filteredData);
      } else {
        setContractors(data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setContractors([]);
    } finally {
      setLoading(false);
    }
  };

  return {
    contractors,
    loading,
    error,
    searchContractors
  };
}