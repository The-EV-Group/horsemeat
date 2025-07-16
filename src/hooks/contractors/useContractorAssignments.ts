import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface ContractorAssignee {
  internal_employee_id: string;
  contractor_id: string;
  assigned_at: string;
  employee?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export function useContractorAssignments(contractorId?: string) {
  const [assignees, setAssignees] = useState<ContractorAssignee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch assignees for a specific contractor
  const getAssigneesForContractor = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('contractor_internal_link')
        .select(`
          internal_employee_id,
          contractor_id,
          assigned_at,
          internal_employee:internal_employee_id (id, full_name, email)
        `)
        .eq('contractor_id', id);

      if (fetchError) throw fetchError;
      
      // Transform the data to include the employee info directly
      const formattedAssignees = data.map(item => ({
        internal_employee_id: item.internal_employee_id,
        contractor_id: item.contractor_id,
        assigned_at: item.assigned_at,
        employee: item.internal_employee
      }));
      
      setAssignees(formattedAssignees);
      return formattedAssignees;
    } catch (err) {
      console.error('Error fetching contractor assignees:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch assignees');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Assign an employee to a contractor
  const assignEmployeeToContractor = async (contractorId: string, employeeId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if the assignment already exists to avoid duplicates
      const { data: existingAssignment } = await supabase
        .from('contractor_internal_link')
        .select('*')
        .eq('contractor_id', contractorId)
        .eq('internal_employee_id', employeeId)
        .single();
      
      if (existingAssignment) {
        // Assignment already exists, no need to create it again
        return { success: true, message: 'Employee already assigned to this contractor' };
      }
      
      const { data, error: insertError } = await supabase
        .from('contractor_internal_link')
        .insert([
          { contractor_id: contractorId, internal_employee_id: employeeId }
        ]);

      if (insertError) throw insertError;
      
      // Refresh the assignees list
      if (contractorId) {
        await getAssigneesForContractor(contractorId);
      }
      
      return { success: true, message: 'Employee assigned successfully' };
    } catch (err) {
      console.error('Error assigning employee to contractor:', err);
      setError(err instanceof Error ? err.message : 'Failed to assign employee');
      return { success: false, message: err instanceof Error ? err.message : 'Failed to assign employee' };
    } finally {
      setLoading(false);
    }
  };

  // Unassign an employee from a contractor
  const unassignEmployeeFromContractor = async (contractorId: string, employeeId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const { error: deleteError } = await supabase
        .from('contractor_internal_link')
        .delete()
        .eq('contractor_id', contractorId)
        .eq('internal_employee_id', employeeId);

      if (deleteError) throw deleteError;
      
      // Refresh the assignees list
      if (contractorId) {
        await getAssigneesForContractor(contractorId);
      }
      
      return { success: true, message: 'Employee unassigned successfully' };
    } catch (err) {
      console.error('Error unassigning employee from contractor:', err);
      setError(err instanceof Error ? err.message : 'Failed to unassign employee');
      return { success: false, message: err instanceof Error ? err.message : 'Failed to unassign employee' };
    } finally {
      setLoading(false);
    }
  };

  // Load assignees when contractorId changes
  useEffect(() => {
    if (contractorId) {
      getAssigneesForContractor(contractorId);
    } else {
      setAssignees([]);
    }
  }, [contractorId]);

  return {
    assignees,
    loading,
    error,
    getAssigneesForContractor,
    assignEmployeeToContractor,
    unassignEmployeeFromContractor
  };
}
