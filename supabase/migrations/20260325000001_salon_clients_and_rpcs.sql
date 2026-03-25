-- Migration: salon_clients table + accept_client_invite + approve_client RPCs
-- Business rules:
-- 1) Clients sign up via /convite/:linkId → pending for salon OWNER (dono) approval
-- 2) Admin geral only approves dono/funcionario — NOT clients
-- 3) Non-invite signups default to role='dono', status='pending' (admin geral approves them)

-- ─────────────────────────────────────────────────────────────
-- 1. Create salon_clients table
--    Separate from salon_members (which is staff-only).
--    UNIQUE(user_id) enforces 1 salon per client user.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.salon_clients (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id   uuid        NOT NULL REFERENCES public.salons(id)   ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT salon_clients_user_id_key UNIQUE (user_id)
);

ALTER TABLE public.salon_clients ENABLE ROW LEVEL SECURITY;

-- Dono of the salon can SELECT their clients
DROP POLICY IF EXISTS "dono can select salon clients" ON public.salon_clients;
CREATE POLICY "dono can select salon clients"
  ON public.salon_clients
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.salon_members sm
      WHERE sm.salon_id = salon_clients.salon_id
        AND sm.user_id  = auth.uid()
        AND sm.role     = 'dono'
    )
  );

-- Client can SELECT their own row
DROP POLICY IF EXISTS "client can select own salon_clients row" ON public.salon_clients;
CREATE POLICY "client can select own salon_clients row"
  ON public.salon_clients
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 2. RPC: accept_client_invite(_link, _user_id)
--    Called from ClientInvitePage after login/signup.
--    Resolves salon via client_link, upserts salon_clients,
--    and sets profile role=cliente/status=pending.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.accept_client_invite(
  _link    text,
  _user_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _salon_id uuid;
BEGIN
  -- Only the authenticated user may link themselves
  IF auth.uid() IS DISTINCT FROM _user_id THEN
    RETURN 'forbidden';
  END IF;

  -- Resolve salon by client_link
  SELECT id INTO _salon_id
  FROM public.salons
  WHERE client_link = _link
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;

  -- Upsert salon_clients (update salon_id if client switches salon)
  INSERT INTO public.salon_clients (salon_id, user_id)
  VALUES (_salon_id, _user_id)
  ON CONFLICT (user_id) DO UPDATE SET salon_id = EXCLUDED.salon_id;

  -- Set client role and leave pending for dono approval
  UPDATE public.profiles
  SET role        = 'cliente',
      status      = 'pending',
      approved_at = NULL
  WHERE id = _user_id;

  RETURN 'ok';
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 3. RPC: approve_client(_client_user_id)
--    Called by dono from owner approval UI.
--    Validates caller is dono of the client's salon,
--    then sets profile status=approved.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.approve_client(
  _client_user_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _salon_id uuid;
BEGIN
  -- Find the salon this client belongs to
  SELECT salon_id INTO _salon_id
  FROM public.salon_clients
  WHERE user_id = _client_user_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;

  -- Caller must be dono of that salon
  IF NOT EXISTS (
    SELECT 1 FROM public.salon_members sm
    WHERE sm.salon_id = _salon_id
      AND sm.user_id  = auth.uid()
      AND sm.role     = 'dono'
  ) THEN
    RETURN 'forbidden';
  END IF;

  -- Approve the client
  UPDATE public.profiles
  SET status      = 'approved',
      approved_at = now()
  WHERE id = _client_user_id;

  RETURN 'ok';
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 4. Update handle_new_user trigger
--    Non-invite, non-admin signups → role='dono', status='pending'
--    Client invite signups → role='cliente', status='pending' (no salon_members insert)
--    Admin email → role='admin', status='approved'
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _salon_link  text;
  _full_name   text;
  _role        text;
  _status      text;
  _approved_at timestamptz;
BEGIN
  _salon_link := NEW.raw_user_meta_data->>'salon_client_link';
  _full_name  := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    ''
  );

  -- Determine role / status based on sign-up context
  IF NEW.email = 'juliatedeschi7@gmail.com' THEN
    _role        := 'admin';
    _status      := 'approved';
    _approved_at := now();
  ELSIF _salon_link IS NOT NULL THEN
    -- Signing up via client invite link → pending for dono approval
    _role        := 'cliente';
    _status      := 'pending';
    _approved_at := NULL;
  ELSE
    -- No-invite signup → treated as prospective salon owner
    _role        := 'dono';
    _status      := 'pending';
    _approved_at := NULL;
  END IF;

  -- Upsert profile (profiles.id = auth.users.id)
  INSERT INTO public.profiles (id, full_name, email, role, status, approved_at)
  VALUES (NEW.id, _full_name, NEW.email, _role, _status, _approved_at)
  ON CONFLICT (id) DO UPDATE SET
    full_name   = COALESCE(EXCLUDED.full_name, profiles.full_name),
    email       = EXCLUDED.email,
    role        = CASE
                    WHEN profiles.role IS NULL THEN EXCLUDED.role
                    ELSE profiles.role
                  END,
    status      = CASE
                    WHEN profiles.status IS NULL THEN EXCLUDED.status
                    ELSE profiles.status
                  END,
    approved_at = CASE
                    WHEN profiles.approved_at IS NULL THEN EXCLUDED.approved_at
                    ELSE profiles.approved_at
                  END;

  -- Admin gets a user_roles entry
  IF NEW.email = 'juliatedeschi7@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure the trigger exists (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

NOTIFY pgrst, 'reload schema';
