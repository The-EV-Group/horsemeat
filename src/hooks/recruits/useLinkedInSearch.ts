import { useState } from 'react';
import { LinkedInSearchService, type LinkedInProfile, type LinkedInSearchResult, type SearchFilters } from '@/services/linkedinSearch';

export interface LinkedInSearchHookResult {
  profiles: LinkedInProfile[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  categories: string[];
  totalResults: number;
  searchLinkedInProfiles: (filters: SearchFilters) => Promise<void>;
  clearResults: () => void;
}

export function useLinkedInSearch(): LinkedInSearchHookResult {
  const [profiles, setProfiles] = useState<LinkedInProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [totalResults, setTotalResults] = useState(0);

  const searchLinkedInProfiles = async (filters: SearchFilters) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Starting LinkedIn search with filters:', filters);

      // Check if any meaningful search criteria are provided
      const hasKeywords = [
        ...filters.skills,
        ...filters.industries,
        ...filters.companies,
        ...filters.certifications,
        ...filters.jobTitles
      ].length > 0;

      if (!hasKeywords) {
        console.log('No search criteria provided');
        setProfiles([]);
        setSearchQuery('');
        setCategories([]);
        setTotalResults(0);
        setLoading(false);
        return;
      }

      const result: LinkedInSearchResult = await LinkedInSearchService.searchProfiles(filters, 10);

      if (result.error) {
        throw new Error(result.error);
      }

      console.log('LinkedIn search completed:', result);
      setProfiles(result.profiles);
      setSearchQuery(result.search_query);
      setCategories(result.categories);
      setTotalResults(result.total_results);

    } catch (err) {
      console.error('LinkedIn search error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during LinkedIn search');
      setProfiles([]);
      setSearchQuery('');
      setCategories([]);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setProfiles([]);
    setError(null);
    setSearchQuery('');
    setCategories([]);
    setTotalResults(0);
  };

  return {
    profiles,
    loading,
    error,
    searchQuery,
    categories,
    totalResults,
    searchLinkedInProfiles,
    clearResults
  };
}
