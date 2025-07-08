import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/auth/useAuth';

interface DashboardStats {
  totalContractors: number;
  activeContractors: number;
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
  contractor_id: string;
  contractor_name?: string;
}

export function useDashboardStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalContractors: 0,
    activeContractors: 0
  });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      // Get total contractors
      const { count: totalCount } = await supabase
        .from('contractor')
        .select('*', { count: 'exact', head: true });

      // Get active contractors
      const { count: activeCount } = await supabase
        .from('contractor')
        .select('*', { count: 'exact', head: true })
        .eq('available', true);

      setStats({
        totalContractors: totalCount || 0,
        activeContractors: activeCount || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('contractor_task')
        .select(`
          *,
          contractor(full_name)
        `)
        .or(`is_public.eq.true,created_by.eq.${user?.id}`)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (error) throw error;

      const tasksWithContractorNames = data.map(task => ({
        ...task,
        contractor_name: task.contractor?.full_name || 'Unknown'
      }));

      setTasks(tasksWithContractorNames);
    } catch (error) {
      console.error('Error fetching tasks:', error);
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

  const getDaysUntilDue = (dueDate: string | null) => {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchTasks()]);
      setLoading(false);
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  return {
    stats,
    tasks,
    loading,
    updateTask,
    deleteTask,
    getDaysUntilDue,
    refreshData: () => {
      fetchStats();
      fetchTasks();
    }
  };
}