
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/auth/useAuth';

interface ContractorData {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  street_address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string | null;
  summary: string | null;
  hourly_rate: number | null;
  salary_lower: number | null;
  salary_higher: number | null;
  preferred_contact: 'email' | 'phone' | 'text';
  available: boolean;
  star_candidate: boolean;
  prefers_hourly: boolean;
  travel_anywhere: boolean;
  travel_radius_miles: number | null;
  pay_type: string | null;
  pay_rate_upper: string | null;
  owner_id: string | null;
  resume_url: string | null;
  notes: string | null;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'overdue' | 'in progress' | 'completed';
  due_date: string | null;
  is_public: boolean;
  created_by: string;
  created_at: string;
  creator_name?: string;
}

interface HistoryEntry {
  id: string;
  note: string;
  inserted_at: string;
  created_by: string;
  creator_name?: string;
}

interface InternalEmployee {
  id: string;
  full_name: string;
  email: string;
  user_id: string;
}

type Keyword = {
  id: string;
  name: string;
  category: string;
  inserted_at: string;
};

type CategorizedKeywords = {
  skills: Keyword[];
  industries: Keyword[];
  certifications: Keyword[];
  companies: Keyword[];
  'job titles': Keyword[];
};

export function useContractorData(contractorId: string) {
  const { user } = useAuth();
  const [contractor, setContractor] = useState<ContractorData | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [employees, setEmployees] = useState<InternalEmployee[]>([]);
  const [keywords, setKeywords] = useState<CategorizedKeywords>({
    skills: [],
    industries: [],
    certifications: [],
    companies: [],
    'job titles': []
  });
  const [loading, setLoading] = useState(true);

  const fetchContractor = useCallback(async () => {
    try {
      const { data: contractorData, error: contractorError } = await supabase
        .from('contractor')
        .select('*')
        .eq('id', contractorId)
        .single();

      if (contractorError) throw contractorError;

      setContractor(contractorData);
    } catch (error) {
      console.error('Error fetching contractor:', error);
    }
  }, [contractorId]);

  const fetchKeywords = useCallback(async () => {
    try {
      console.log('Fetching keywords for contractor:', contractorId);
      
      const { data: keywordData, error: keywordError } = await supabase
        .from('contractor_keyword')
        .select(`
          keyword:keyword_id (
            id,
            name,
            category,
            inserted_at
          )
        `)
        .eq('contractor_id', contractorId);

      if (keywordError) {
        console.error('Error fetching keywords:', keywordError);
        throw keywordError;
      }

      console.log('Raw keyword data:', keywordData);

      // Transform to categorized structure
      const categorized: CategorizedKeywords = {
        skills: [],
        industries: [],
        certifications: [],
        companies: [],
        'job titles': []
      };

      // Map database categories to display categories
      const categoryMap: Record<string, keyof CategorizedKeywords> = {
        'skill': 'skills',
        'industry': 'industries',
        'certification': 'certifications',
        'company': 'companies',
        'job_title': 'job titles'
      };

      keywordData?.forEach(item => {
        if (item.keyword) {
          const dbCategory = item.keyword.category;
          const displayCategory = categoryMap[dbCategory];
          
          console.log(`Processing keyword: ${item.keyword.name}, DB category: ${dbCategory}, Display category: ${displayCategory}`);
          
          if (displayCategory && categorized[displayCategory]) {
            categorized[displayCategory].push({
              id: item.keyword.id,
              name: item.keyword.name,
              category: item.keyword.category,
              inserted_at: item.keyword.inserted_at
            });
          } else {
            console.warn(`Could not map keyword ${item.keyword.name} with category ${dbCategory} to a display category`);
          }
        } else {
          console.warn('Received keyword relationship without keyword data');
        }
      });

      console.log('Categorized keywords:', categorized);
      setKeywords(categorized);
    } catch (error) {
      console.error('Error fetching keywords:', error);
    }
  }, [contractorId]);

  const fetchTasks = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('contractor_task')
        .select(`
          *,
          internal_employee!fk_created_by_employee(full_name)
        `)
        .eq('contractor_id', contractorId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const tasksWithCreatorNames = (data || []).map(task => ({
        ...task,
        creator_name: task.internal_employee?.full_name || 'Unknown'
      }));

      setTasks(tasksWithCreatorNames);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  }, [contractorId]);

  const fetchHistory = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('contractor_history')
        .select(`
          *,
          internal_employee!fk_history_created_by(full_name)
        `)
        .eq('contractor_id', contractorId)
        .order('inserted_at', { ascending: false });

      if (error) throw error;

      const historyWithCreatorNames = (data || []).map(entry => ({
        ...entry,
        creator_name: entry.internal_employee?.full_name || 'Unknown'
      }));

      setHistory(historyWithCreatorNames);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  }, [contractorId]);

  const fetchEmployees = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('internal_employee')
        .select('*');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  }, []);

  const updateContractor = async (updates: Partial<ContractorData>) => {
    try {
      const { error } = await supabase
        .from('contractor')
        .update(updates)
        .eq('id', contractorId);

      if (error) throw error;
      await fetchContractor();
    } catch (error) {
      console.error('Error updating contractor:', error);
      throw error;
    }
  };

  const updateKeywords = async (categorizedKeywords: CategorizedKeywords) => {
    try {
      console.log('Updating keywords with:', categorizedKeywords);
      
      // Convert categorized keywords back to flat array
      const allKeywords = Object.entries(categorizedKeywords).flatMap(([category, keywords]) =>
        keywords.map(keyword => ({
          id: keyword.id,
          name: keyword.name,
          category: keyword.category
        }))
      );

      console.log('Flattened keywords for update:', allKeywords);

      // Delete existing keywords for this contractor
      const { error: deleteError } = await supabase
        .from('contractor_keyword')
        .delete()
        .eq('contractor_id', contractorId);

      if (deleteError) throw deleteError;

      // Insert new keywords if any
      if (allKeywords.length > 0) {
        const keywordInserts = allKeywords.map((keyword, index) => ({
          contractor_id: contractorId,
          keyword_id: keyword.id,
          note: null,
          position: index + 1
        }));

        console.log('Inserting keywords:', keywordInserts);

        const { error: insertError } = await supabase
          .from('contractor_keyword')
          .insert(keywordInserts);

        if (insertError) throw insertError;
      }

      // Refresh keywords after update
      await fetchKeywords();
    } catch (error) {
      console.error('Error updating keywords:', error);
      throw error;
    }
  };

  const addTask = async (task: Omit<Task, 'id' | 'created_at' | 'created_by'>) => {
    try {
      const { error } = await supabase
        .from('contractor_task')
        .insert({
          ...task,
          contractor_id: contractorId,
          created_by: user?.id,
          created_at: new Date().toISOString()
        });

      if (error) throw error;
      await fetchTasks();
    } catch (error) {
      console.error('Error adding task:', error);
      throw error;
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
      const { error } = await supabase
        .from('contractor_task')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      await fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const { error } = await supabase
        .from('contractor_task')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  };

  const addHistoryEntry = async (note: string) => {
    try {
      const { error } = await supabase
        .from('contractor_history')
        .insert({
          contractor_id: contractorId,
          note,
          created_by: user?.id,
          inserted_at: new Date().toISOString()
        });

      if (error) throw error;
      await fetchHistory();
    } catch (error) {
      console.error('Error adding history entry:', error);
      throw error;
    }
  };

  const updateHistoryEntry = async (id: string, note: string) => {
    try {
      const { error } = await supabase
        .from('contractor_history')
        .update({ note })
        .eq('id', id);

      if (error) throw error;
      await fetchHistory();
    } catch (error) {
      console.error('Error updating history entry:', error);
      throw error;
    }
  };

  const deleteHistoryEntry = async (id: string) => {
    try {
      const { error } = await supabase
        .from('contractor_history')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchHistory();
    } catch (error) {
      console.error('Error deleting history entry:', error);
      throw error;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!contractorId) return;
      
      setLoading(true);
      await Promise.all([
        fetchContractor(),
        fetchKeywords(),
        fetchTasks(),
        fetchHistory(),
        fetchEmployees()
      ]);
      setLoading(false);
    };

    fetchData();
  }, [contractorId, user, fetchContractor, fetchKeywords, fetchTasks, fetchHistory, fetchEmployees]);

  return {
    contractor,
    tasks,
    history,
    employees,
    keywords,
    loading,
    updateContractor,
    updateKeywords,
    addTask,
    updateTask,
    deleteTask,
    addHistoryEntry,
    updateHistoryEntry,
    deleteHistoryEntry,
    refreshData: () => {
      fetchContractor();
      fetchKeywords();
      fetchTasks();
      fetchHistory();
      fetchEmployees();
    }
  };
}
