-- Drop ALL existing policies on salons
DROP POLICY IF EXISTS "Admin can delete salons" ON public.salons;
DROP POLICY IF EXISTS "Admin can view all salons" ON public.salons;
DROP POLICY IF EXISTS "Authenticated users can create own salons" ON public.salons;
DROP POLICY IF EXISTS "Members can view own salon" ON public.salons;
DROP POLICY IF EXISTS "Owner can update own salon" ON public.salons;

-- Create simple permissive policies
CREATE POLICY "Anyone authenticated can insert salons"
ON public.salons FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Anyone authenticated can select salons"
ON public.salons FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Anyone authenticated can update salons"
ON public.salons FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "Anyone authenticated can delete salons"
ON public.salons FOR DELETE TO authenticated
USING (true);

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';