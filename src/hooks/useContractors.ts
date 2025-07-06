
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

type Contractor = Tables<'contractor'>;
type ContractorInsert = TablesInsert<'contractor'>;
type ContractorKeyword = Tables<'contractor_keyword'>;

export function useContractors() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createContractor = async (
    contractorData: Omit<ContractorInsert, 'id' | 'inserted_at'>,
    keywords: { keyword_id: string; note?: string }[] = []
  ) => {
    try {
      setLoading(true);
      setError(null);

      // Insert contractor
      const { data: contractor, error: contractorError } = await supabase
        .from('contractor')
        .insert(contractorData)
        .select()
        .single();

      if (contractorError) throw contractorError;

      // Insert contractor keywords if any
      if (keywords.length > 0) {
        const keywordInserts = keywords.map((kw, index) => ({
          contractor_id: contractor.id,
          keyword_id: kw.keyword_id,
          note: kw.note || null,
          position: index + 1,
        }));

        const { error: keywordError } = await supabase
          .from('contractor_keyword')
          .insert(keywordInserts);

        if (keywordError) {
          console.error('Error inserting keywords:', keywordError);
          // Don't fail the whole operation for keyword errors
        }
      }

      return contractor;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const uploadResume = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `resumes/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = await supabase.storage
        .from('resumes')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (err) {
      console.error('Error uploading resume:', err);
      throw err;
    }
  };

  return {
    loading,
    error,
    createContractor,
    uploadResume,
  };
}
