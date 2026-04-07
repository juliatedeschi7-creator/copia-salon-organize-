-- Fix team_invites schema: add any columns that may be missing from a
-- manually-created table, recreate RLS policies, and add the
-- get_team_invite_by_token RPC used by the invite-acceptance page.
-- All statements are idempotent (safe to run on a fresh or existing DB).

-- 1. Ensure the table exists (no-op when already present)
CREATE TABLE IF NOT EXISTS public.team_invites (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token      text NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  salon_id   uuid NOT NULL,
  role       text NOT NULL DEFAULT 'funcionario',
  created_by uuid NOT NULL,
  used_at    timestamptz NULL,
  used_by    uuid NULL,
  expires_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Add any columns that may be missing from a partially-created table.
--    Columns that require NOT NULL are added as nullable first so that the
--    ALTER TABLE succeeds even when rows already exist; applications always
--    supply these values on insert, so NULL rows only arise from the old
--    manually-created table that had no data yet.
ALTER TABLE public.team_invites
  ADD COLUMN IF NOT EXISTS token      text         UNIQUE DEFAULT gen_random_uuid()::text,
  ADD COLUMN IF NOT EXISTS salon_id   uuid         NULL,
  ADD COLUMN IF NOT EXISTS role       text         NOT NULL DEFAULT 'funcionario',
  ADD COLUMN IF NOT EXISTS created_by uuid         NULL,
  ADD COLUMN IF NOT EXISTS used_at    timestamptz  NULL,
  ADD COLUMN IF NOT EXISTS used_by    uuid         NULL,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz  NULL,
  ADD COLUMN IF NOT EXISTS created_at timestamptz  NOT NULL DEFAULT now();

-- 3. Ensure unique constraint on token exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.team_invites'::regclass
       AND contype IN ('u', 'p')
       AND conkey @> ARRAY[(
         SELECT attnum FROM pg_attribute
          WHERE attrelid = 'public.team_invites'::regclass
            AND attname = 'token'
       )]::smallint[]
  ) THEN
    ALTER TABLE public.team_invites ADD CONSTRAINT team_invites_token_key UNIQUE (token);
  END IF;
END
$$;

-- 4. Add FK: created_by -> auth.users (only if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.team_invites'::regclass
       AND contype = 'f'
       AND conname = 'team_invites_created_by_fkey'
  ) THEN
    ALTER TABLE public.team_invites
      ADD CONSTRAINT team_invites_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END
$$;

-- 5. Add FK: salon_id -> public.salons (only if salons table is present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.team_invites'::regclass
       AND contype = 'f'
       AND conname = 'team_invites_salon_id_fkey'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'salons'
  ) THEN
    ALTER TABLE public.team_invites
      ADD CONSTRAINT team_invites_salon_id_fkey
      FOREIGN KEY (salon_id) REFERENCES public.salons(id) ON DELETE CASCADE;
  END IF;
END
$$;

-- 6. Indexes
CREATE INDEX IF NOT EXISTS team_invites_salon_id_idx ON public.team_invites (salon_id);
CREATE INDEX IF NOT EXISTS team_invites_token_idx    ON public.team_invites (token);

-- 7. Enable RLS
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies (recreate idempotently)
DROP POLICY IF EXISTS "owners can create team invites" ON public.team_invites;
CREATE POLICY "owners can create team invites"
  ON public.team_invites FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.salon_members sm
       WHERE sm.salon_id = team_invites.salon_id
         AND sm.user_id  = auth.uid()
         AND sm.role     = 'dono'
    )
  );

DROP POLICY IF EXISTS "owners can read team invites" ON public.team_invites;
CREATE POLICY "owners can read team invites"
  ON public.team_invites FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.salon_members sm
       WHERE sm.salon_id = team_invites.salon_id
         AND sm.user_id  = auth.uid()
         AND sm.role     = 'dono'
    )
  );

DROP POLICY IF EXISTS "owners can delete team invites" ON public.team_invites;
CREATE POLICY "owners can delete team invites"
  ON public.team_invites FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.salon_members sm
       WHERE sm.salon_id = team_invites.salon_id
         AND sm.user_id  = auth.uid()
         AND sm.role     = 'dono'
    )
  );

DROP POLICY IF EXISTS "authenticated can read invite by token" ON public.team_invites;
CREATE POLICY "authenticated can read invite by token"
  ON public.team_invites FOR SELECT TO authenticated
  USING (true);

-- 9. RPC: get_team_invite_by_token
--    Returns the invite row together with salon info so the acceptance page
--    can show the salon name/logo without a separate query.
CREATE OR REPLACE FUNCTION public.get_team_invite_by_token(_token text)
RETURNS TABLE (
  id                  uuid,
  salon_id            uuid,
  salon_name          text,
  salon_logo_url      text,
  salon_primary_color text,
  role                text,
  expires_at          timestamptz,
  used_at             timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ti.id,
    ti.salon_id,
    s.name            AS salon_name,
    s.logo_url        AS salon_logo_url,
    s.primary_color   AS salon_primary_color,
    ti.role,
    ti.expires_at,
    ti.used_at
  FROM public.team_invites ti
  JOIN public.salons        s  ON s.id = ti.salon_id
  WHERE ti.token = _token
  LIMIT 1;
$$;

-- 10. RPC: accept_team_invite (idempotent replace)
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

  -- Upsert salon membership
  INSERT INTO public.salon_members (salon_id, user_id, role)
  VALUES (_invite.salon_id, _user_id, _invite.role)
  ON CONFLICT (salon_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  -- Approve the user
  UPDATE public.profiles
  SET status      = 'approved',
      approved_at = now(),
      role        = _invite.role
  WHERE id = _user_id;

  -- Mark invite as used
  UPDATE public.team_invites
  SET used_at = now(),
      used_by = _user_id
  WHERE id = _invite.id;

  RETURN 'ok';
END;
$$;

-- 11. Notify PostgREST to reload schema cache immediately
NOTIFY pgrst, 'reload schema';
