
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { Tables } from '@/integrations/supabase/types';

type Contractor = Tables<'contractor'>;
type ContractorHistory = Tables<'contractor_history'>;
type ContractorTask = Tables<'contractor_task'>;

interface HistoryEntry extends ContractorHistory {
  creator_name?: string;
}

interface Task extends ContractorTask {
  creator_name?: string;
}

export function useContractorData(contractorId: string) {
  const { user } = useAuth();
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch contractor data
  const fetchContractor = async () => {
    try {
      const { data, error } = await supabase
        .from('contractor')
        .select('*')
        .eq('id', contractorId)
        .single();

      if (error) throw error;
      setContractor(data);
    } catch (error) {
      console.error('Error fetching contractor:', error);
    }
  };

  // Fetch history entries
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
      
      const historyWithNames = data.map(entry => ({
        ...entry,
        creator_name: entry.internal_employee?.full_name || 'Unknown'
      }));
      
      setHistory(historyWithNames);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  // Fetch tasks
  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('contractor_task')
        .select(`
          *,
          internal_employee!fk_created_by_employee(full_name)
        `)
        .eq('contractor_id', contractorId)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (error) throw error;
      
      const tasksWithNames = data.map(task => ({
        ...task,
        creator_name: task.internal_employee?.full_name || 'Unknown'
      }));
      
      setTasks(tasksWithNames);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  // Update contractor
  const updateContractor = async (id: string, updates: Partial<Contractor>) => {
    try {
      const { error } = await supabase
        .from('contractor')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      // Update local state
      setContractor(prev => prev ? { ...prev, ...updates } : null);
    } catch (error) {
      console.error('Error updating contractor:', error);
      throw error;
    }
  };

  // Delete contractor
  const deleteContractor = async (id: string) => {
    try {
      const { error } = await supabase
        .from('contractor')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting contractor:', error);
      throw error;
    }
  };

  // Add history entry
  const addHistoryEntry = async (note: string) => {
    try {
      const { error } = await supabase
        .from('contractor_history')
        .insert({
          contractor_id: contractorId,
          note,
          created_by: user?.id
        });

      if (error) throw error;
      await fetchHistory();
    } catch (error) {
      console.error('Error adding history entry:', error);
      throw error;
    }
  };

  // Update history entry
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

  // Delete history entry
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

  // Add task
  const addTask = async (taskData: Omit<ContractorTask, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'contractor_id'>) => {
    try {
      const { error } = await supabase
        .from('contractor_task')
        .insert({
          ...taskData,
          contractor_id: contractorId,
          created_by: user?.id
        });

      if (error) throw error;
      await fetchTasks();
    } catch (error) {
      console.error('Error adding task:', error);
      throw error;
    }
  };

  // Update task
  const updateTask = async (id: string, updates: Partial<ContractorTask>) => {
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

  // Delete task
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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([
        fetchContractor(),
        fetchHistory(),
        fetchTasks()
      ]);
      setLoading(false);
    };

    if (contractorId) {
      fetchData();
    }
  }, [contractorId]);

  return {
    contractor,
    history,
    tasks,
    loading,
    updateContractor,
    deleteContractor,
    addHistoryEntry,
    updateHistoryEntry,
    deleteHistoryEntry,
    addTask,
    updateTask,
    deleteTask
  };
}
