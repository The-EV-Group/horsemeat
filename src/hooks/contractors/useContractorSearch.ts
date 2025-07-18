
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
  const [allContractors, setAllContractors] = useState<Contractor[]>([]); // Store all results
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [currentLimit, setCurrentLimit] = useState(7);

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
   * Search for contractors with keyword filtering - optimized with proper scoring
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
      
      console.log(`Searching with ${keywordIds.length} keywords:`, keywordIds);
      
      if (keywordIds.length === 0) {
        await searchWithoutKeywords(filters);
        return;
      }
      
      // Step 1: Get contractors that match other filters first (without keywords)
      let baseQuery = supabase
        .from('contractor')
        .select('*');
      
      // Apply non-keyword filters
      if (filters.searchTerm && filters.searchTerm.trim()) {
        const searchTerm = filters.searchTerm.trim();
        baseQuery = baseQuery.or(
          `full_name.ilike.%${searchTerm}%,` +
          `email.ilike.%${searchTerm}%,` +
          `phone.ilike.%${searchTerm}%,` +
          `summary.ilike.%${searchTerm}%,` +
          `notes.ilike.%${searchTerm}%`
        );
      }

      if (filters.available === true || filters.available === false) {
        baseQuery = baseQuery.eq('available', filters.available);
      }

      if (filters.payType && filters.payType.trim()) {
        baseQuery = baseQuery.eq('pay_type', filters.payType);
      }

      if (filters.state && filters.state.trim()) {
        baseQuery = baseQuery.eq('state', filters.state);
      }

      if (filters.city && filters.city.trim()) {
        baseQuery = baseQuery.eq('city', filters.city);
      }

      const { data: baseContractors, error: baseError } = await baseQuery;
      
      if (baseError) {
        console.error('Error in base contractor query:', baseError);
        throw baseError;
      }
      
      if (!baseContractors || baseContractors.length === 0) {
        console.log('No contractors match the base filters');
        setContractors([]);
        return;
      }
      
      console.log(`Found ${baseContractors.length} contractors matching base filters`);
      
      // Step 2: Get keyword matches for these contractors
      const contractorIds = baseContractors.map(c => c.id);
      
      const { data: keywordMatches, error: keywordError } = await supabase
        .from('contractor_keyword')
        .select('contractor_id, keyword_id')
        .in('contractor_id', contractorIds)
        .in('keyword_id', keywordIds);
      
      if (keywordError) {
        console.error('Error fetching keyword matches:', keywordError);
        throw keywordError;
      }
      
      console.log(`Found ${keywordMatches?.length || 0} keyword matches`);
      
      // Step 3: Calculate match scores
      const contractorScores: Record<string, { contractor: any; matchingKeywords: Set<string> }> = {};
      
      // Initialize all contractors with empty keyword sets
      baseContractors.forEach(contractor => {
        contractorScores[contractor.id] = {
          contractor,
          matchingKeywords: new Set()
        };
      });
      
      // Count unique keyword matches per contractor
      keywordMatches?.forEach(match => {
        if (contractorScores[match.contractor_id]) {
          contractorScores[match.contractor_id].matchingKeywords.add(match.keyword_id);
        }
      });
      
      // Step 4: Filter contractors that have at least one keyword match and calculate percentages
      const contractorsWithScores = Object.values(contractorScores)
        .filter(({ matchingKeywords }) => matchingKeywords.size > 0) // Only include contractors with keyword matches
        .map(({ contractor, matchingKeywords }) => {
          const matchingKeywordCount = matchingKeywords.size;
          const matchPercentage = Math.round((matchingKeywordCount / keywordIds.length) * 100);
          
          console.log(`Contractor ${contractor.full_name}: ${matchingKeywordCount}/${keywordIds.length} keywords = ${matchPercentage}%`);
          
          return {
            ...contractor,
            matchingKeywordCount,
            matchPercentage
          };
        })
        .sort((a, b) => {
          // Sort by match percentage (highest first), then by number of matching keywords
          if (b.matchPercentage !== a.matchPercentage) {
            return b.matchPercentage - a.matchPercentage;
          }
          return b.matchingKeywordCount - a.matchingKeywordCount;
        });
      
      console.log(`Final result: ${contractorsWithScores.length} contractors with keyword matches`);
      console.log('Match distribution:', contractorsWithScores.reduce((acc, c) => {
        acc[c.matchPercentage] = (acc[c.matchPercentage] || 0) + 1;
        return acc;
      }, {} as Record<number, number>));
      
      // Store all results and set pagination state
      setAllContractors(contractorsWithScores);
      setCurrentLimit(7);
      setHasMore(contractorsWithScores.length > 7);
      setContractors(contractorsWithScores.slice(0, 7));
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
      
      // Store all results and set pagination state
      const allResults = data || [];
      setAllContractors(allResults);
      setCurrentLimit(7);
      setHasMore(allResults.length > 7);
      setContractors(allResults.slice(0, 7));
    } catch (err) {
      console.error('Error listing all contractors:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setContractors([]);
      setAllContractors([]);
      setHasMore(false);
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

  const showMore = async () => {
    try {
      setLoadingMore(true);
      const newLimit = currentLimit + 7;
      const moreContractors = allContractors.slice(0, newLimit);
      
      setContractors(moreContractors);
      setCurrentLimit(newLimit);
      setHasMore(allContractors.length > newLimit);
      
      console.log(`Showing ${moreContractors.length} of ${allContractors.length} contractors`);
    } catch (err) {
      console.error('Error loading more contractors:', err);
    } finally {
      setLoadingMore(false);
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
      setAllContractors(prev => prev.filter(c => c.id !== contractorId));
    } catch (err) {
      console.error('Error deleting contractor:', err);
      throw err;
    }
  };

  return {
    contractors,
    loading,
    loadingMore,
    error,
    hasMore,
    totalResults: allContractors.length,
    searchContractors,
    listAllContractors,
    searchByName,
    showMore,
    deleteContractor
  };
}
