
-- Drop the restrictive policy
DROP POLICY IF EXISTS "Authenticated users can create own salons" ON public.salons;

-- Recreate as PERMISSIVE (default)
CREATE POLICY "Authenticated users can create own salons"
ON public.salons
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

NOTIFY pgrst, 'reload schema';
