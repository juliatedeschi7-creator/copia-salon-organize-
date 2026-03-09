-- Substitua a função existente por esta
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

  -- Assign role to the correct user
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _invite.role)
  ON CONFLICT DO NOTHING;

  -- Upsert salon membership
  INSERT INTO public.salon_members (salon_id, user_id, role)
  VALUES (_invite.salon_id, _user_id, _invite.role)
  ON CONFLICT (salon_id, user_id) DO UPDATE SET role = _invite.role;

  -- Approve the correct user
  UPDATE public.profiles
  SET is_approved = true
  WHERE user_id = _user_id;

  -- Mark invite as used
  UPDATE public.team_invites
  SET used_at = now(), used_by = _user_id
  WHERE id = _invite.id;

  RETURN 'ok';
END;
$$;
