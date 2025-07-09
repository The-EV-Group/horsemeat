
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/integrations/supabase/types';

type InternalEmployee = Tables<'internal_employee'>;

interface InternalEmployeeSectionProps {
  selectedEmployee: string | null;
  onEmployeeChange: (employeeId: string | null) => void;
}

export function InternalEmployeeSection({ selectedEmployee, onEmployeeChange }: InternalEmployeeSectionProps) {
  const [employees, setEmployees] = useState<InternalEmployee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('internal_employee')
        .select('*')
        .order('full_name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching internal employees:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle>Assign Internal Employee</CardTitle>
        <CardDescription>Link this contractor to an internal employee</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Label htmlFor="internal-employee">Internal Employee</Label>
          <Select 
            value={selectedEmployee || 'no-assignment'} 
            onValueChange={(value) => onEmployeeChange(value === 'no-assignment' ? null : value)}
            disabled={loading}
          >
            <SelectTrigger id="internal-employee">
              <SelectValue placeholder={loading ? "Loading employees..." : "Select an internal employee"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no-assignment">No assignment</SelectItem>
              {employees.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.full_name || employee.email || 'Unnamed Employee'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
