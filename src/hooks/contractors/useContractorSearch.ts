
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

      // Determine if we need to use a more complex query with keyword filtering
      if (hasKeywords) {
        await searchWithKeywords(filters);
      } else {
        await searchWithoutKeywords(filters);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setContractors([]);
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Search for contractors without keyword filtering
   */
  const searchWithoutKeywords = async (filters: SearchFilters) => {
    try {
      let query = supabase
        .from('contractor')
        .select('*')
        .order('inserted_at', { ascending: false });

      // Apply text search across multiple fields
      if (filters.searchTerm && filters.searchTerm.trim()) {
        const searchTerm = filters.searchTerm.trim();
        
        // Search across multiple fields with OR conditions
        query = query.or(
          `full_name.ilike.%${searchTerm}%,` +
          `email.ilike.%${searchTerm}%,` +
          `phone.ilike.%${searchTerm}%,` +
          `summary.ilike.%${searchTerm}%,` +
          `notes.ilike.%${searchTerm}%`
        );
      }

      // Apply boolean filters
      if (filters.available === true || filters.available === false) {
        query = query.eq('available', filters.available);
      }

      // Apply pay type filter
      if (filters.payType && filters.payType.trim()) {
        query = query.eq('pay_type', filters.payType);
      }

      // Apply location filters
      if (filters.state && filters.state.trim()) {
        query = query.eq('state', filters.state);
      }

      if (filters.city && filters.city.trim()) {
        query = query.eq('city', filters.city);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Supabase query error:', error);
        throw error;
      }

      console.log('Query returned:', data?.length, 'contractors');
      setContractors(data || []);
    } catch (error) {
      console.error('Error in searchWithoutKeywords:', error);
      throw error;
    }
  };
  
  /**
   * Search for contractors with keyword filtering - optimized for large datasets
   */
  const searchWithKeywords = async (filters: SearchFilters) => {
    try {
      // Get all keyword IDs from the filters
      const keywordIds = [
        ...filters.skills.map(k => k.id),
        ...filters.industries.map(k => k.id),
        ...filters.companies.map(k => k.id),
        ...filters.certifications.map(k => k.id),
        ...filters.jobTitles.map(k => k.id)
      ];
      
      console.log(`Searching with ${keywordIds.length} keywords`);
      
      // Use a more efficient approach with a single query that joins contractors and keywords
      // This avoids loading all contractor-keyword relationships into memory
      let query = supabase
        .from('contractor')
        .select(`
          *,
          contractor_keyword!inner(keyword_id)
        `)
        .in('contractor_keyword.keyword_id', keywordIds)
        .order('inserted_at', { ascending: false });
      
      // Apply text search if provided
      if (filters.searchTerm && filters.searchTerm.trim()) {
        const searchTerm = filters.searchTerm.trim();
        query = query.or(
          `full_name.ilike.%${searchTerm}%,` +
          `email.ilike.%${searchTerm}%,` +
          `phone.ilike.%${searchTerm}%,` +
          `summary.ilike.%${searchTerm}%,` +
          `notes.ilike.%${searchTerm}%`
        );
      }

      // Apply boolean filters
      if (filters.available === true || filters.available === false) {
        query = query.eq('available', filters.available);
      }

      // Apply pay type filter
      if (filters.payType && filters.payType.trim()) {
        query = query.eq('pay_type', filters.payType);
      }

      // Apply location filters
      if (filters.state && filters.state.trim()) {
        query = query.eq('state', filters.state);
      }

      if (filters.city && filters.city.trim()) {
        query = query.eq('city', filters.city);
      }

      // Execute the query
      const { data: contractorsWithKeywords, error } = await query;
      
      if (error) {
        console.error('Error in contractor search query:', error);
        throw error;
      }
      
      if (!contractorsWithKeywords || contractorsWithKeywords.length === 0) {
        console.log('No contractors match the filters');
        setContractors([]);
        return;
      }
      
      console.log(`Found ${contractorsWithKeywords.length} contractors with at least one matching keyword`);
      
      // Group contractors by ID to remove duplicates and count matching keywords
      const contractorMap: Record<string, any> = {};
      contractorsWithKeywords.forEach(contractor => {
        if (!contractorMap[contractor.id]) {
          contractorMap[contractor.id] = {
            ...contractor,
            matchingKeywordCount: 1
          };
        } else {
          contractorMap[contractor.id].matchingKeywordCount++;
        }
      });
      
      // Convert to array and calculate match percentages
      const contractorsWithScores = Object.values(contractorMap).map(contractor => {
        const matchPercentage = keywordIds.length > 0
          ? Math.round((contractor.matchingKeywordCount / keywordIds.length) * 100)
          : 0;
        
        return {
          ...contractor,
          matchPercentage
        };
      });
      
      // Sort by match percentage (highest first)
      contractorsWithScores.sort((a, b) => (b.matchPercentage || 0) - (a.matchPercentage || 0));
      
      console.log('Final result:', contractorsWithScores.length, 'contractors with match scores');
      setContractors(contractorsWithScores);
    } catch (error) {
      console.error('Error in searchWithKeywords:', error);
      throw error;
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
