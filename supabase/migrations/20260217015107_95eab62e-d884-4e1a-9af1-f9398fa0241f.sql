-- Add SELECT policy allowing owner to see their own salon by owner_id
CREATE POLICY "Owner can view own salon"
ON public.salons FOR SELECT TO authenticated
USING (owner_id = auth.uid());

NOTIFY pgrst, 'reload schema';