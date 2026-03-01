-- Drop current INSERT policy
DROP POLICY IF EXISTS "Dono can insert own salon" ON public.salons;

-- Create INSERT policy without owner_id check
CREATE POLICY "Authenticated can create salon"
ON public.salons FOR INSERT TO authenticated
WITH CHECK (true);

-- Create trigger to auto-set owner_id to the authenticated user
CREATE OR REPLACE FUNCTION public.set_salon_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.owner_id = auth.uid();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_salon_owner_trigger
BEFORE INSERT ON public.salons
FOR EACH ROW
EXECUTE FUNCTION public.set_salon_owner();

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';