
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/integrations/supabase/types';

type Contractor = Tables<'contractor'> & {
  matchPercentage?: number;
};
type Keyword = Tables<'keyword'>;

export interface SearchFilters {
  searchTerm?: string;
  available?: boolean | null;
  payType?: string | null;
  state?: string;
  city?: string;
  skills: Keyword[];
  industries: Keyword[];
  companies: Keyword[];
  certifications: Keyword[];
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
      console.log('Starting search with filters:', filters);
      
      // Check if any meaningful search criteria are provided
      const hasSearchTerm = filters.searchTerm && filters.searchTerm.trim().length > 0;
      const hasAvailableFilter = filters.available === true || filters.available === false;
      const hasPayTypeFilter = filters.payType && filters.payType.trim().length > 0;
      const hasStateFilter = filters.state && filters.state.trim().length > 0;
      const hasCityFilter = filters.city && filters.city.trim().length > 0;
      const hasKeywords = [
        ...filters.skills,
        ...filters.industries,
        ...filters.companies,
        ...filters.certifications,
        ...filters.jobTitles
      ].length > 0;
      
      // If no search criteria provided, return empty results
      if (!hasSearchTerm && !hasAvailableFilter && 
          !hasPayTypeFilter && !hasStateFilter && !hasCityFilter && !hasKeywords) {
        console.log('No search criteria provided');
        setContractors([]);
        setLoading(false);
        return;
      }

      let query = supabase
        .from('contractor')
        .select('*')
        .order('inserted_at', { ascending: false });

      // Apply text search
      if (filters.searchTerm && filters.searchTerm.trim()) {
        query = query.or(`full_name.ilike.%${filters.searchTerm}%,email.ilike.%${filters.searchTerm}%,phone.ilike.%${filters.searchTerm}%`);
      }

      // Apply boolean filters - only if they are explicitly set (not null/undefined)
      if (filters.available === true || filters.available === false) {
        query = query.eq('available', filters.available);
      }

      // Removed star_candidate filter as part of multi-assignee model refactoring

      // Apply pay type filter
      if (filters.payType && filters.payType.trim()) {
        query = query.eq('pay_type', filters.payType);
      }

      // Apply state filter
      if (filters.state && filters.state.trim()) {
        query = query.eq('state', filters.state);
      }

      // Apply city filter
      if (filters.city && filters.city.trim()) {
        query = query.eq('city', filters.city);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Supabase query error:', error);
        throw error;
      }

      console.log('Query returned:', data?.length, 'contractors');

      // Calculate match percentage and filter by keywords
      const allKeywords = [
        ...filters.skills.map(k => k.id),
        ...filters.industries.map(k => k.id),
        ...filters.companies.map(k => k.id),
        ...filters.certifications.map(k => k.id),
        ...filters.jobTitles.map(k => k.id)
      ];

      if (allKeywords.length > 0) {
        // Get all contractor keywords
        const { data: contractorKeywords, error: keywordError } = await supabase
          .from('contractor_keyword')
          .select('contractor_id, keyword_id');

        if (keywordError) {
          console.error('Error fetching contractor keywords:', keywordError);
          throw keywordError;
        }

        // Calculate match percentages
        const contractorsWithMatches = data?.map(contractor => {
          const contractorKeywordIds = contractorKeywords
            ?.filter(ck => ck.contractor_id === contractor.id)
            .map(ck => ck.keyword_id) || [];
          
          const matchingKeywords = allKeywords.filter(keywordId => 
            contractorKeywordIds.includes(keywordId)
          );
          
          const matchPercentage = Math.round((matchingKeywords.length / allKeywords.length) * 100);
          
          return {
            ...contractor,
            matchPercentage
          };
        }).filter(contractor => contractor.matchPercentage > 0) || [];

        // Sort by match percentage (highest first)
        contractorsWithMatches.sort((a, b) => (b.matchPercentage || 0) - (a.matchPercentage || 0));
        console.log('Contractors with match percentages:', contractorsWithMatches.length);

        setContractors(contractorsWithMatches);
      } else {
        console.log('No keywords selected, returning all matching contractors');
        setContractors(data || []);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setContractors([]);
    } finally {
      setLoading(false);
    }
  };

  const listAllContractors = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Listing all contractors');

      const { data, error } = await supabase
        .from('contractor')
        .select('*')
        .order('full_name');

      if (error) {
        console.error('Error fetching all contractors:', error);
        throw error;
      }

      console.log('All contractors fetched:', data?.length);
      setContractors(data || []);
    } catch (err) {
      console.error('Error listing all contractors:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setContractors([]);
    } finally {
      setLoading(false);
    }
  };

  const searchByName = async (searchTerm: string) => {
    try {
      setLoading(true);
      setError(null);

      if (!searchTerm.trim()) {
        setContractors([]);
        return;
      }

      const { data, error } = await supabase
        .from('contractor')
        .select('*')
        .ilike('full_name', `%${searchTerm}%`)
        .order('full_name');

      if (error) throw error;
      setContractors(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setContractors([]);
    } finally {
      setLoading(false);
    }
  };

  const deleteContractor = async (contractorId: string) => {
    try {
      // First delete related records
      await supabase
        .from('contractor_keyword')
        .delete()
        .eq('contractor_id', contractorId);

      await supabase
        .from('contractor_history')
        .delete()
        .eq('contractor_id', contractorId);

      await supabase
        .from('contractor_task')
        .delete()
        .eq('contractor_id', contractorId);

      // Then delete the contractor
      const { error } = await supabase
        .from('contractor')
        .delete()
        .eq('id', contractorId);

      if (error) throw error;

      // Update local state
      setContractors(prev => prev.filter(c => c.id !== contractorId));
    } catch (err) {
      console.error('Error deleting contractor:', err);
      throw err;
    }
  };

  return {
    contractors,
    loading,
    error,
    searchContractors,
    listAllContractors,
    searchByName,
    deleteContractor
  };
}
