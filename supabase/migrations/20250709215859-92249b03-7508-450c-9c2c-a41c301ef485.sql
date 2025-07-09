
-- Fix Issue 3: Allow all authenticated users to view all internal employees
-- This enables the dropdown to show all employees while maintaining security for other operations
CREATE POLICY "All authenticated users can view internal employees" 
ON public.internal_employee 
FOR SELECT 
TO authenticated 
USING (true);

-- Optional: Add a proper foreign key constraint to improve data integrity
-- Note: This creates a proper link between contractor_task.created_by and internal_employee.user_id
ALTER TABLE public.contractor_task 
ADD CONSTRAINT fk_created_by_employee 
FOREIGN KEY (created_by) 
REFERENCES public.internal_employee(user_id);
