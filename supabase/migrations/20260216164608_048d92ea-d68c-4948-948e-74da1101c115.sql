
-- Security definer function to get basic salon info by client_link (public access)
CREATE OR REPLACE FUNCTION public.get_salon_by_client_link(_link text)
RETURNS TABLE(id uuid, name text, logo_url text, primary_color text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.name, s.logo_url, s.primary_color
  FROM public.salons s
  WHERE s.client_link = _link
  LIMIT 1
$$;

-- Update handle_new_user to auto-approve clients signing up via salon link
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _salon_link text;
  _salon_id uuid;
BEGIN
  _salon_link := NEW.raw_user_meta_data->>'salon_client_link';

  INSERT INTO public.profiles (user_id, name, email, is_approved)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    CASE
      WHEN NEW.email = 'juliatedeschi7@gmail.com' THEN true
      WHEN _salon_link IS NOT NULL THEN true
      ELSE false
    END
  );

  -- Admin auto-role
  IF NEW.email = 'juliatedeschi7@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;

  -- Client via salon link: assign cliente role + salon membership
  IF _salon_link IS NOT NULL THEN
    SELECT s.id INTO _salon_id FROM public.salons s WHERE s.client_link = _salon_link LIMIT 1;
    IF _salon_id IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'cliente');
      INSERT INTO public.salon_members (salon_id, user_id, role) VALUES (_salon_id, NEW.id, 'cliente');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Allow clients to insert themselves via salon membership (for trigger)
-- The trigger runs as SECURITY DEFINER so it bypasses RLS, no policy change needed.

-- Allow clients to view their own salon
-- Already covered by "Members can view own salon" policy since we add them to salon_members
