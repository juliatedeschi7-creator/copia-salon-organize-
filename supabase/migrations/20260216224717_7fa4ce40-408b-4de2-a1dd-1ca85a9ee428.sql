
-- Drop the restrictive policy and recreate as permissive
DROP POLICY IF EXISTS "Approved users can create salons" ON public.salons;

CREATE POLICY "Approved users can create salons"
ON public.salons
FOR INSERT
TO authenticated
WITH CHECK (is_approved(auth.uid()) AND (owner_id = auth.uid()));
