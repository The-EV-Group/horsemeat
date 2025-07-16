
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/integrations/supabase/types';

type InternalEmployee = Tables<'internal_employee'>;

interface InternalEmployeeSectionProps {
  selectedEmployees: string[];
  onEmployeesChange: (employeeIds: string[]) => void;
}

export function InternalEmployeeSection({ selectedEmployees, onEmployeesChange }: InternalEmployeeSectionProps) {
  const [employees, setEmployees] = useState<InternalEmployee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      // Fetch all internal employees
      const { data, error } = await supabase
        .from('internal_employee')
        .select('*')
        .order('full_name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching internal employees:', error);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeToggle = (employeeId: string, isChecked: boolean) => {
    if (isChecked) {
      // Add employee to selected list
      onEmployeesChange([...selectedEmployees, employeeId]);
    } else {
      // Remove employee from selected list
      onEmployeesChange(selectedEmployees.filter(id => id !== employeeId));
    }
  };

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle>Assign Internal Employees</CardTitle>
        <CardDescription>Link this contractor to one or more internal employees</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {selectedEmployees.length > 0 ? (
              employees
                .filter(emp => selectedEmployees.includes(emp.id))
                .map(emp => (
                  <Badge key={emp.id} variant="secondary" className="px-2 py-1">
                    {emp.full_name || emp.email || 'Unnamed Employee'}
                  </Badge>
                ))
            ) : (
              <p className="text-sm text-muted-foreground">No employees selected</p>
            )}
          </div>
          
          <Label>Available Employees</Label>
          <ScrollArea className="h-[200px] border rounded-md p-4">
            <div className="space-y-2">
              {loading ? (
                <p>Loading employees...</p>
              ) : employees.length === 0 ? (
                <p>No employees found</p>
              ) : (
                employees.map((employee) => (
                  <div key={employee.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`employee-${employee.id}`}
                      checked={selectedEmployees.includes(employee.id)}
                      onCheckedChange={(checked) => 
                        handleEmployeeToggle(employee.id, checked === true)
                      }
                    />
                    <Label
                      htmlFor={`employee-${employee.id}`}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {employee.full_name || employee.email || 'Unnamed Employee'}
                    </Label>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
