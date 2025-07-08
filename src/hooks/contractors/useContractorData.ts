import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/integrations/supabase/types';

type Contractor = Tables<'contractor'>;
type Keyword = Tables<'keyword'>;

interface ContractorWithKeywords extends Contractor {
  keywords: {
    skills: Keyword[];
    industries: Keyword[];
    certifications: Keyword[];
    companies: Keyword[];
    'job titles': Keyword[];
  };
}

export function useContractorData(contractorId: string | undefined) {
  const [contractor, setContractor] = useState<ContractorWithKeywords | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!contractorId) {
      setLoading(false);
      return;
    }

    fetchContractor();
  }, [contractorId]);

  const fetchContractor = async () => {
    if (!contractorId) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch contractor
      const { data: contractorData, error: contractorError } = await supabase
        .from('contractor')
        .select('*')
        .eq('id', contractorId)
        .single();

      if (contractorError) throw contractorError;

      // Fetch contractor keywords with keyword details
      const { data: keywordData, error: keywordError } = await supabase
        .from('contractor_keyword')
        .select(`
          keyword_id,
          keyword:keyword_id (
            id,
            name,
            category,
            inserted_at
          )
        `)
        .eq('contractor_id', contractorId);

      if (keywordError) throw keywordError;

      // Group keywords by category
      const keywords = {
        skills: [],
        industries: [],
        certifications: [],
        companies: [],
        'job titles': []
      } as ContractorWithKeywords['keywords'];

      keywordData?.forEach(item => {
        if (item.keyword) {
          const category = getCategoryDisplayName(item.keyword.category);
          if (keywords[category]) {
            keywords[category].push(item.keyword);
          }
        }
      });

      setContractor({
        ...contractorData,
        keywords
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const updateContractor = async (updates: Partial<Contractor>) => {
    if (!contractorId) return;

    try {
      const { error } = await supabase
        .from('contractor')
        .update(updates)
        .eq('id', contractorId);

      if (error) throw error;

      setContractor(prev => prev ? { ...prev, ...updates } : null);
    } catch (err) {
      console.error('Error updating contractor:', err);
      throw err;
    }
  };

  const updateContractorKeywords = async (keywords: ContractorWithKeywords['keywords']) => {
    if (!contractorId) return;

    try {
      // Delete existing keywords
      await supabase
        .from('contractor_keyword')
        .delete()
        .eq('contractor_id', contractorId);

      // Insert new keywords
      const keywordInserts: any[] = [];
      let position = 1;

      Object.entries(keywords).forEach(([category, categoryKeywords]) => {
        categoryKeywords.forEach(keyword => {
          keywordInserts.push({
            contractor_id: contractorId,
            keyword_id: keyword.id,
            position: position++
          });
        });
      });

      if (keywordInserts.length > 0) {
        const { error } = await supabase
          .from('contractor_keyword')
          .insert(keywordInserts);

        if (error) throw error;
      }

      setContractor(prev => prev ? { ...prev, keywords } : null);
    } catch (err) {
      console.error('Error updating contractor keywords:', err);
      throw err;
    }
  };

  // Helper function to convert database category to display category
  const getCategoryDisplayName = (dbCategory: string): keyof ContractorWithKeywords['keywords'] => {
    const mapping: Record<string, keyof ContractorWithKeywords['keywords']> = {
      'skill': 'skills',
      'industry': 'industries',
      'certification': 'certifications',
      'company': 'companies',
      'job_title': 'job titles'
    };
    return mapping[dbCategory] || 'skills';
  };

  return {
    contractor,
    loading,
    error,
    updateContractor,
    updateContractorKeywords,
    refetch: fetchContractor
  };
}