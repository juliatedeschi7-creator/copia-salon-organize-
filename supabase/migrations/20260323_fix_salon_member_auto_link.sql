-- Fix: Auto-link clients to salon on signup via invite link

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
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    CASE
      WHEN NEW.email = 'juliatedeschi7@gmail.com' THEN true
      WHEN _salon_link IS NOT NULL THEN true
      ELSE false
    END
  )
  ON CONFLICT (user_id) DO UPDATE SET 
    name = COALESCE(EXCLUDED.name, profiles.name),
    is_approved = CASE
      WHEN profiles.email = 'juliatedeschi7@gmail.com' THEN true
      WHEN _salon_link IS NOT NULL THEN true
      ELSE profiles.is_approved
    END;

  IF NEW.email = 'juliatedeschi7@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) 
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  -- 🔥 AUTO-LINK CLIENT TO SALON (THE FIX)
  IF _salon_link IS NOT NULL THEN
    SELECT s.id INTO _salon_id 
    FROM public.salons s 
    WHERE s.client_link = _salon_link 
    LIMIT 1;
    
    IF _salon_id IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role) 
      VALUES (NEW.id, 'cliente')
      ON CONFLICT (user_id, role) DO NOTHING;
      
      INSERT INTO public.salon_members (salon_id, user_id, role)
      VALUES (_salon_id, NEW.id, 'cliente')
      ON CONFLICT (salon_id, user_id) DO UPDATE 
      SET role = 'cliente', updated_at = now();
    END IF;
  END IF;

  RETURN NEW;
END
$$;
