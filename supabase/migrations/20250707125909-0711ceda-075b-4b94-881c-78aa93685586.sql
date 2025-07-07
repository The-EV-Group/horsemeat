
-- Add enum for contractor_task status
CREATE TYPE public.task_status AS ENUM ('overdue', 'in progress', 'completed');

-- Update contractor_task table to use the enum
ALTER TABLE public.contractor_task 
ALTER COLUMN status TYPE task_status USING status::task_status;
