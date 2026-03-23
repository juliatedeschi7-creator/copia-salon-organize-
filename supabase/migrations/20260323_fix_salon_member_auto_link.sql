-- Fix: Handle profile creation conflicts and auto-link clients to salon
-- This replaces the problematic handle_new_user trigger

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

  -- 🔥 FIX: Use ON CONFLICT to handle duplicate profile creation
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
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, profiles.name),
    is_approved = CASE
      WHEN EXCLUDED.email = 'juliatedeschi7@gmail.com' THEN true
      WHEN _salon_link IS NOT NULL THEN true
      ELSE profiles.is_approved
    END;

  -- Admin role
  IF NEW.email = 'juliatedeschi7@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) 
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  -- 🔥 FIX: Auto-link client to salon - use ON CONFLICT
  IF _salon_link IS NOT NULL THEN
    SELECT s.id INTO _salon_id 
    FROM public.salons s 
    WHERE s.client_link = _salon_link 
    LIMIT 1;
    
    IF _salon_id IS NOT NULL THEN
      -- Assign cliente role
      INSERT INTO public.user_roles (user_id, role) 
      VALUES (NEW.id, 'cliente')
      ON CONFLICT (user_id, role) DO NOTHING;
      
      -- Add to salon_members - 🔥 THIS IS THE CRITICAL FIX
      INSERT INTO public.salon_members (salon_id, user_id, role)
      VALUES (_salon_id, NEW.id, 'cliente')
      ON CONFLICT (salon_id, user_id) DO UPDATE 
      SET role = 'cliente', updated_at = now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
