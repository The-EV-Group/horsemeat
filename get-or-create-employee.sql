-- SQL function to get or create employee record
-- Run this in your Supabase SQL editor

CREATE OR REPLACE FUNCTION get_or_create_employee(
  p_user_id UUID,
  p_email TEXT,
  p_full_name TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  inserted_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  employee_record RECORD;
BEGIN
  -- First try to find by user_id
  SELECT * INTO employee_record
  FROM internal_employee
  WHERE internal_employee.user_id = p_user_id
  LIMIT 1;
  
  -- If found, return it
  IF FOUND THEN
    RETURN QUERY
    SELECT 
      employee_record.id,
      employee_record.user_id,
      employee_record.email,
      employee_record.full_name,
      employee_record.role,
      employee_record.inserted_at;
    RETURN;
  END IF;
  
  -- If not found by user_id, try by email
  SELECT * INTO employee_record
  FROM internal_employee
  WHERE internal_employee.email = p_email
  LIMIT 1;
  
  -- If found by email, update user_id and return
  IF FOUND THEN
    UPDATE internal_employee 
    SET user_id = p_user_id
    WHERE id = employee_record.id;
    
    -- Get the updated record
    SELECT * INTO employee_record
    FROM internal_employee
    WHERE id = employee_record.id;
    
    RETURN QUERY
    SELECT 
      employee_record.id,
      employee_record.user_id,
      employee_record.email,
      employee_record.full_name,
      employee_record.role,
      employee_record.inserted_at;
    RETURN;
  END IF;
  
  -- If not found at all, create new record
  INSERT INTO internal_employee (user_id, email, full_name, role)
  VALUES (p_user_id, p_email, COALESCE(p_full_name, split_part(p_email, '@', 1)), 'staff')
  RETURNING * INTO employee_record;
  
  RETURN QUERY
  SELECT 
    employee_record.id,
    employee_record.user_id,
    employee_record.email,
    employee_record.full_name,
    employee_record.role,
    employee_record.inserted_at;
END;
$$;