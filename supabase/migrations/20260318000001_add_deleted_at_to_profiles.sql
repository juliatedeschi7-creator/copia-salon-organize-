-- Add soft-delete support to profiles table
-- Idempotent: safe to run multiple times

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

-- Partial index: only indexes soft-deleted rows, keeping it small and efficient
CREATE INDEX IF NOT EXISTS profiles_deleted_at_idx
  ON public.profiles (deleted_at)
  WHERE deleted_at IS NOT NULL;
