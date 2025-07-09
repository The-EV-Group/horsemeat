import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/auth/useAuth';

interface ContractorData {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
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
  keywords: Array<{
    id: string;
    name: string;
    category: string;
    note?: string;
  }>;
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
  const [loading, setLoading] = useState(true);

  const fetchContractor = async () => {
    try {
      const { data: contractorData, error: contractorError } = await supabase
        .from('contractor')
        .select('*')
        .eq('id', contractorId)
        .single();

      if (contractorError) throw contractorError;

      const { data: keywordData, error: keywordError } = await supabase
        .from('contractor_keyword')
        .select(`
          note,
          keyword(id, name, category)
        `)
        .eq('contractor_id', contractorId);

      if (keywordError) throw keywordError;

      const keywords = keywordData?.map(item => ({
        id: item.keyword.id,
        name: item.keyword.name,
        category: item.keyword.category,
        note: item.note || undefined
      })) || [];

      setContractor({
        ...contractorData,
        keywords
      });
    } catch (error) {
      console.error('Error fetching contractor:', error);
    }
  };

  const fetchTasks = async () => {
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
  };

  const fetchHistory = async () => {
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
  };

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('internal_employee')
        .select('*');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

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
      // Convert categorized keywords back to flat array
      const allKeywords = Object.entries(categorizedKeywords).flatMap(([category, keywords]) =>
        keywords.map(keyword => ({
          id: keyword.id,
          name: keyword.name,
          category: keyword.category
        }))
      );

      // Delete existing keywords
      const { error: deleteError } = await supabase
        .from('contractor_keyword')
        .delete()
        .eq('contractor_id', contractorId);

      if (deleteError) throw deleteError;

      // Insert new keywords
      if (allKeywords.length > 0) {
        const keywordInserts = allKeywords.map((keyword, index) => ({
          contractor_id: contractorId,
          keyword_id: keyword.id,
          note: null,
          position: index + 1
        }));

        const { error: insertError } = await supabase
          .from('contractor_keyword')
          .insert(keywordInserts);

        if (insertError) throw insertError;
      }

      await fetchContractor();
    } catch (error) {
      console.error('Error updating keywords:', error);
      throw error;
    }
  };

  // Transform flat keywords array to categorized structure
  const getCategorizedKeywords = (): CategorizedKeywords => {
    if (!contractor?.keywords) {
      return {
        skills: [],
        industries: [],
        certifications: [],
        companies: [],
        'job titles': []
      };
    }

    const categorized: CategorizedKeywords = {
      skills: [],
      industries: [],
      certifications: [],
      companies: [],
      'job titles': []
    };

    contractor.keywords.forEach(keyword => {
      const category = keyword.category as keyof CategorizedKeywords;
      if (categorized[category]) {
        categorized[category].push({
          id: keyword.id,
          name: keyword.name,
          category: keyword.category,
          inserted_at: new Date().toISOString() // Add required field
        });
      }
    });

    return categorized;
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
        fetchTasks(),
        fetchHistory(),
        fetchEmployees()
      ]);
      setLoading(false);
    };

    fetchData();
  }, [contractorId, user]);

  return {
    contractor,
    tasks,
    history,
    employees,
    keywords: getCategorizedKeywords(),
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
      fetchTasks();
      fetchHistory();
      fetchEmployees();
    }
  };
}
