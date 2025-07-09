
-- First, let's check what policies exist on internal_employee
-- The current policy only allows users to see their own record
-- But for the dashboard to work, all authenticated users need to view all internal employees

-- Drop the restrictive policy that only allows users to see their own record
DROP POLICY IF EXISTS "Allow employee to view own record" ON public.internal_employee;

-- The migration already added this policy, but let's make sure it exists:
-- "All authenticated users can view internal employees"
-- This policy should already exist from the previous migration, but let's recreate it to be sure
DROP POLICY IF EXISTS "All authenticated users can view internal employees" ON public.internal_employee;

CREATE POLICY "All authenticated users can view internal employees" 
ON public.internal_employee 
FOR SELECT 
TO authenticated 
USING (true);
