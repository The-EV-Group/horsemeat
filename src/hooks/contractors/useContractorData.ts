
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/integrations/supabase/types';

type Contractor = Tables<'contractor'>;
type Keyword = Tables<'keyword'>;
type HistoryEntry = Tables<'contractor_history'>;
type Task = Tables<'contractor_task'>;

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
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [keywords, setKeywords] = useState<ContractorWithKeywords['keywords']>({
    skills: [],
    industries: [],
    certifications: [],
    companies: [],
    'job titles': []
  });
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
      const keywordsGrouped = {
        skills: [],
        industries: [],
        certifications: [],
        companies: [],
        'job titles': []
      } as ContractorWithKeywords['keywords'];

      keywordData?.forEach(item => {
        if (item.keyword) {
          const category = getCategoryDisplayName(item.keyword.category);
          if (keywordsGrouped[category]) {
            keywordsGrouped[category].push(item.keyword);
          }
        }
      });

      // Fetch history entries
      const { data: historyData, error: historyError } = await supabase
        .from('contractor_history')
        .select(`
          *,
          created_by,
          internal_employee!fk_history_created_by (
            full_name
          )
        `)
        .eq('contractor_id', contractorId)
        .order('inserted_at', { ascending: false });

      if (historyError) throw historyError;

      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('contractor_task')
        .select(`
          *,
          created_by,
          internal_employee!fk_created_by_employee (
            full_name
          )
        `)
        .eq('contractor_id', contractorId)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

      setContractor({
        ...contractorData,
        keywords: keywordsGrouped
      });
      setKeywords(keywordsGrouped);
      setHistory(historyData || []);
      setTasks(tasksData || []);
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

  const updateContractorKeywords = async (newKeywords: ContractorWithKeywords['keywords']) => {
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

      Object.entries(newKeywords).forEach(([category, categoryKeywords]) => {
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

      setContractor(prev => prev ? { ...prev, keywords: newKeywords } : null);
      setKeywords(newKeywords);
    } catch (err) {
      console.error('Error updating contractor keywords:', err);
      throw err;
    }
  };

  const addHistoryEntry = async (note: string) => {
    if (!contractorId) return;

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('contractor_history')
        .insert([{
          contractor_id: contractorId,
          note,
          created_by: userData.user?.id
        }])
        .select(`
          *,
          internal_employee!fk_history_created_by (
            full_name
          )
        `)
        .single();

      if (error) throw error;

      setHistory(prev => [data, ...prev]);
    } catch (err) {
      console.error('Error adding history entry:', err);
      throw err;
    }
  };

  const updateHistoryEntry = async (id: string, note: string) => {
    try {
      const { error } = await supabase
        .from('contractor_history')
        .update({ note })
        .eq('id', id);

      if (error) throw error;

      setHistory(prev => prev.map(entry => 
        entry.id === id ? { ...entry, note } : entry
      ));
    } catch (err) {
      console.error('Error updating history entry:', err);
      throw err;
    }
  };

  const deleteHistoryEntry = async (id: string) => {
    try {
      const { error } = await supabase
        .from('contractor_history')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setHistory(prev => prev.filter(entry => entry.id !== id));
    } catch (err) {
      console.error('Error deleting history entry:', err);
      throw err;
    }
  };

  const addTask = async (task: Omit<Task, 'id' | 'created_at' | 'created_by'>) => {
    if (!contractorId) return;

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('contractor_task')
        .insert([{
          ...task,
          contractor_id: contractorId,
          created_by: userData.user?.id
        }])
        .select(`
          *,
          internal_employee!fk_created_by_employee (
            full_name
          )
        `)
        .single();

      if (error) throw error;

      setTasks(prev => [data, ...prev]);
    } catch (err) {
      console.error('Error adding task:', err);
      throw err;
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
      const { error } = await supabase
        .from('contractor_task')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setTasks(prev => prev.map(task => 
        task.id === id ? { ...task, ...updates } : task
      ));
    } catch (err) {
      console.error('Error updating task:', err);
      throw err;
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const { error } = await supabase
        .from('contractor_task')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTasks(prev => prev.filter(task => task.id !== id));
    } catch (err) {
      console.error('Error deleting task:', err);
      throw err;
    }
  };

  const updateKeywords = async (newKeywords: ContractorWithKeywords['keywords']) => {
    await updateContractorKeywords(newKeywords);
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
    history,
    tasks,
    keywords,
    loading,
    error,
    updateContractor,
    updateContractorKeywords,
    addHistoryEntry,
    updateHistoryEntry,
    deleteHistoryEntry,
    addTask,
    updateTask,
    deleteTask,
    updateKeywords,
    refetch: fetchContractor
  };
}
