
-- Add DELETE policy for contractor table to allow authenticated users to delete contractors
CREATE POLICY "contractor_delete" ON public.contractor
FOR DELETE
TO authenticated
USING (auth.role() = 'authenticated'::text);
