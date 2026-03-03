-- Team invite tokens: single-use tokens for inviting team members (dono/funcionario)
CREATE TABLE public.team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  role text NOT NULL CHECK (role IN ('dono', 'funcionario')),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  used_at timestamptz,
  used_by uuid
);

ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

-- Only salon owners can view/manage team invites for their salon
CREATE POLICY "Owner can manage team invites" ON public.team_invites
  FOR ALL USING (public.is_salon_owner(auth.uid(), salon_id));

-- RPC: get invite details by token (no auth required – runs as SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_team_invite_by_token(_token text)
RETURNS TABLE (
  id uuid,
  salon_id uuid,
  salon_name text,
  salon_logo_url text,
  salon_primary_color text,
  role text,
  expires_at timestamptz,
  used_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ti.id,
    ti.salon_id,
    s.name AS salon_name,
    s.logo_url AS salon_logo_url,
    s.primary_color AS salon_primary_color,
    ti.role,
    ti.expires_at,
    ti.used_at
  FROM public.team_invites ti
  JOIN public.salons s ON s.id = ti.salon_id
  WHERE ti.token = _token
  LIMIT 1
$$;

-- RPC: accept a team invite for an already-authenticated user
CREATE OR REPLACE FUNCTION public.accept_team_invite(_token text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invite record;
BEGIN
  SELECT * INTO _invite FROM public.team_invites
  WHERE token = _token
  LIMIT 1;

  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  IF _invite.used_at IS NOT NULL THEN RETURN 'already_used'; END IF;
  IF _invite.expires_at IS NOT NULL AND _invite.expires_at < now() THEN RETURN 'expired'; END IF;

  -- Assign role to user
  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), _invite.role)
  ON CONFLICT DO NOTHING;

  -- Upsert salon membership
  INSERT INTO public.salon_members (salon_id, user_id, role)
  VALUES (_invite.salon_id, auth.uid(), _invite.role)
  ON CONFLICT (salon_id, user_id) DO UPDATE SET role = _invite.role;

  -- Approve user
  UPDATE public.profiles
  SET is_approved = true
  WHERE user_id = auth.uid();

  -- Mark invite as used (single-use)
  UPDATE public.team_invites
  SET used_at = now(), used_by = auth.uid()
  WHERE id = _invite.id;

  RETURN 'ok';
END;
$$;

-- Update handle_new_user to also handle team invite tokens on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _salon_link text;
  _salon_id uuid;
  _team_token text;
  _invite record;
BEGIN
  _salon_link  := NEW.raw_user_meta_data->>'salon_client_link';
  _team_token  := NEW.raw_user_meta_data->>'salon_team_invite_token';

  INSERT INTO public.profiles (user_id, name, email, is_approved)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    CASE
      WHEN NEW.email = 'juliatedeschi7@gmail.com' THEN true
      WHEN _salon_link IS NOT NULL THEN true
      WHEN _team_token IS NOT NULL THEN true
      ELSE false
    END
  );

  -- Admin auto-role
  IF NEW.email = 'juliatedeschi7@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;

  -- Client via salon link
  IF _salon_link IS NOT NULL THEN
    SELECT s.id INTO _salon_id FROM public.salons s WHERE s.client_link = _salon_link LIMIT 1;
    IF _salon_id IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'cliente');
      INSERT INTO public.salon_members (salon_id, user_id, role) VALUES (_salon_id, NEW.id, 'cliente');
    END IF;
  END IF;

  -- Team member via single-use invite token
  IF _team_token IS NOT NULL THEN
    SELECT * INTO _invite FROM public.team_invites
    WHERE token = _team_token
      AND used_at IS NULL
      AND (expires_at IS NULL OR expires_at > now())
    LIMIT 1;

    IF _invite.id IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, _invite.role)
      ON CONFLICT DO NOTHING;

      INSERT INTO public.salon_members (salon_id, user_id, role)
      VALUES (_invite.salon_id, NEW.id, _invite.role)
      ON CONFLICT (salon_id, user_id) DO UPDATE SET role = _invite.role;

      UPDATE public.team_invites
      SET used_at = now(), used_by = NEW.id
      WHERE id = _invite.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
