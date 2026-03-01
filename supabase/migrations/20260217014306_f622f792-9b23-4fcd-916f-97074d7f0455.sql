-- Drop temporary permissive policies
DROP POLICY IF EXISTS "Anyone authenticated can insert salons" ON public.salons;
DROP POLICY IF EXISTS "Anyone authenticated can select salons" ON public.salons;
DROP POLICY IF EXISTS "Anyone authenticated can update salons" ON public.salons;
DROP POLICY IF EXISTS "Anyone authenticated can delete salons" ON public.salons;

-- Recreate proper policies (all PERMISSIVE by default)
CREATE POLICY "Dono can insert own salon"
ON public.salons FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Members can view own salon"
ON public.salons FOR SELECT TO authenticated
USING (is_salon_member(auth.uid(), id));

CREATE POLICY "Admin can view all salons"
ON public.salons FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owner can update own salon"
ON public.salons FOR UPDATE TO authenticated
USING (is_salon_owner(auth.uid(), id));

CREATE POLICY "Admin can delete salons"
ON public.salons FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';