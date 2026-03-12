-- Add user access lifecycle columns to profiles table

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS access_state text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS access_message text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS notice_until timestamptz NULL,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

-- Add check constraint for allowed access_state values
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_access_state_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_access_state_check
    CHECK (access_state IN ('active', 'notice', 'blocked'));

-- Indexes for admin filtering
CREATE INDEX IF NOT EXISTS idx_profiles_access_state ON public.profiles (access_state);
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON public.profiles (deleted_at);

NOTIFY pgrst, 'reload schema';
