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
  creator_name?: string;
}

interface InternalEmployee {
  id: string;
  full_name: string;
  email: string;
  user_id: string;
}

export function useDashboardStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalContractors: 0,
    activeContractors: 0
  });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<InternalEmployee[]>([]);
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

  const fetchEmployees = async () => {
    try {
      // Use the service role approach to bypass RLS for internal operations
      const { data, error } = await supabase
        .from('internal_employee')
        .select('*');

      if (error) {
        console.error('Error fetching employees:', error);
        // Fallback: try to get at least basic employee info
        const { data: fallbackData } = await supabase
          .from('internal_employee')
          .select('id, full_name, email, user_id');
        
        setEmployees(fallbackData || []);
      } else {
        setEmployees(data || []);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchTasks = async () => {
    if (!user?.id) {
      console.log('No user ID found, cannot fetch tasks');
      return;
    }

    try {
      console.log('Fetching tasks for user ID:', user.id);

      // First, get all tasks that the user can see
      const { data: taskData, error: taskError } = await supabase
        .from('contractor_task')
        .select('*')
        .or(`is_public.eq.true,created_by.eq.${user.id}`)
        .order('due_date', { ascending: true, nullsFirst: false });

      console.log('Tasks query result:', { data: taskData, error: taskError });

      if (taskError) throw taskError;

      if (!taskData || taskData.length === 0) {
        console.log('No tasks found');
        setTasks([]);
        setCompletedTasks([]);
        return;
      }

      // Get all unique contractor IDs and creator user IDs
      const contractorIds = [...new Set(taskData.map(task => task.contractor_id).filter(Boolean))];
      const creatorUserIds = [...new Set(taskData.map(task => task.created_by).filter(Boolean))];

      console.log('Fetching data for contractor IDs:', contractorIds);
      console.log('Fetching data for creator user IDs:', creatorUserIds);

      // Fetch contractor names
      const { data: contractorData, error: contractorError } = await supabase
        .from('contractor')
        .select('id, full_name')
        .in('id', contractorIds);

      if (contractorError) {
        console.error('Error fetching contractors:', contractorError);
      }

      // Try multiple approaches to fetch creator names due to RLS policies
      let creatorData = null;
      let creatorError = null;

      // First attempt: Direct query (should work with our new RLS policy)
      const creatorQuery = await supabase
        .from('internal_employee')
        .select('user_id, full_name')
        .in('user_id', creatorUserIds);

      creatorData = creatorQuery.data;
      creatorError = creatorQuery.error;

      console.log('Creator query attempt 1:', { data: creatorData, error: creatorError });

      // If we didn't get all the creators we need, try individual queries
      if (!creatorData || creatorData.length < creatorUserIds.length) {
        console.log('Not all creators found, trying individual queries...');
        
        const individualCreators = [];
        for (const userId of creatorUserIds) {
          try {
            const { data: individualData } = await supabase
              .from('internal_employee')
              .select('user_id, full_name')
              .eq('user_id', userId)
              .maybeSingle();
            
            if (individualData) {
              individualCreators.push(individualData);
            }
          } catch (err) {
            console.log(`Could not fetch creator for user_id ${userId}:`, err);
          }
        }
        
        console.log('Individual creator queries result:', individualCreators);
        
        // Merge results, preferring individual queries if they found more data
        if (individualCreators.length > (creatorData?.length || 0)) {
          creatorData = individualCreators;
        }
      }

      console.log('Final contractor data:', contractorData);
      console.log('Final creator data:', creatorData);

      // Create lookup maps
      const contractorMap = new Map(
        (contractorData || []).map(contractor => [contractor.id, contractor.full_name])
      );
      const creatorMap = new Map(
        (creatorData || []).map(creator => [creator.user_id, creator.full_name])
      );

      console.log('Creator map contents:', Array.from(creatorMap.entries()));

      // Enhance tasks with names - ensure proper string typing
      const tasksWithNames: Task[] = taskData.map(task => {
        const contractorName = contractorMap.get(task.contractor_id || '') || 'Unknown';
        const creatorName = creatorMap.get(task.created_by || '') || 'Unknown';
        
        console.log(`Task ${task.id}: contractor_id=${task.contractor_id} -> ${contractorName}, created_by=${task.created_by} -> ${creatorName}`);
        
        return {
          ...task,
          contractor_id: task.contractor_id || '',
          created_by: task.created_by || '',
          created_at: task.created_at || '',
          contractor_name: contractorName,
          creator_name: creatorName
        };
      });

      console.log('Tasks with names:', tasksWithNames);
      processTasks(tasksWithNames);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const processTasks = async (tasksWithNames: Task[]) => {
    // Update overdue tasks automatically
    const tasksToUpdate = tasksWithNames.filter(task => {
      if (!task.due_date || task.status === 'completed') return false;
      const daysUntil = getDaysUntilDue(task.due_date);
      return daysUntil !== null && daysUntil < 0 && task.status !== 'overdue';
    });

    // Update overdue tasks in the database
    for (const task of tasksToUpdate) {
      await updateTask(task.id, { status: 'overdue' });
    }

    // Separate completed and non-completed tasks
    const activeTasks = tasksWithNames.filter(task => task.status !== 'completed');
    const completedTasksList = tasksWithNames.filter(task => task.status === 'completed');

    setTasks(activeTasks);
    setCompletedTasks(completedTasksList);
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
      await Promise.all([fetchStats(), fetchTasks(), fetchEmployees()]);
      setLoading(false);
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  return {
    stats,
    tasks,
    completedTasks,
    employees,
    loading,
    updateTask,
    deleteTask,
    getDaysUntilDue,
    refreshData: () => {
      fetchStats();
      fetchTasks();
      fetchEmployees();
    }
  };
}
