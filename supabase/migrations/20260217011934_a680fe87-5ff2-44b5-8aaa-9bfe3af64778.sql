-- Drop the existing policy
DROP POLICY IF EXISTS "Approved users can create salons" ON public.salons;

-- Recreate with a new name to force PostgREST to pick it up
CREATE POLICY "Donos can create salons"
ON public.salons
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid() AND is_approved(auth.uid()));

-- Notify PostgREST to reload
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
