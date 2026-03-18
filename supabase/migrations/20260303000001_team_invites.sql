-- Create team_invites table if not exists
CREATE TABLE IF NOT EXISTS public.team_invites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token       text NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  salon_id    uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('dono', 'funcionario')),
  created_by  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  used_at     timestamptz NULL,
  used_by     uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at  timestamptz NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

-- Salon owners can create invites for their salon
DROP POLICY IF EXISTS "owners can create team invites" ON public.team_invites;
CREATE POLICY "owners can create team invites"
  ON public.team_invites
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.salon_members sm
      WHERE sm.salon_id = team_invites.salon_id
        AND sm.user_id = auth.uid()
        AND sm.role = 'dono'
    )
  );

-- Salon owners can read invites for their salon
DROP POLICY IF EXISTS "owners can read team invites" ON public.team_invites;
CREATE POLICY "owners can read team invites"
  ON public.team_invites
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.salon_members sm
      WHERE sm.salon_id = team_invites.salon_id
        AND sm.user_id = auth.uid()
        AND sm.role = 'dono'
    )
  );

-- Salon owners can delete invites for their salon
DROP POLICY IF EXISTS "owners can delete team invites" ON public.team_invites;
CREATE POLICY "owners can delete team invites"
  ON public.team_invites
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.salon_members sm
      WHERE sm.salon_id = team_invites.salon_id
        AND sm.user_id = auth.uid()
        AND sm.role = 'dono'
    )
  );

-- Anyone authenticated can read invite by token (to accept it)
DROP POLICY IF EXISTS "authenticated can read invite by token" ON public.team_invites;
CREATE POLICY "authenticated can read invite by token"
  ON public.team_invites
  FOR SELECT
  TO authenticated
  USING (true);

-- Fix accept_team_invite to use current profiles schema:
-- profiles uses: id, full_name, email, role, status, approved_at (no user_id, no is_approved)
-- salon_members uses: salon_id, user_id where user_id = profiles.id
CREATE OR REPLACE FUNCTION public.accept_team_invite(_token text, _user_id uuid)
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

  -- Upsert salon membership (user_id = profiles.id)
  INSERT INTO public.salon_members (salon_id, user_id, role)
  VALUES (_invite.salon_id, _user_id, _invite.role)
  ON CONFLICT (salon_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  -- Approve the user by updating profiles.status and role
  UPDATE public.profiles
  SET status = 'approved',
      approved_at = now(),
      role = _invite.role
  WHERE id = _user_id;

  -- Mark invite as used
  UPDATE public.team_invites
  SET used_at = now(), used_by = _user_id
  WHERE id = _invite.id;

  RETURN 'ok';
END;
$$;

NOTIFY pgrst, 'reload schema';
