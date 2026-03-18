-- Fix: add deleted_at column to profiles for soft-delete support
-- This migration is idempotent (safe to run multiple times via IF NOT EXISTS).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

-- Index to speed up admin queries that filter soft-deleted rows
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at
  ON public.profiles (deleted_at);

NOTIFY pgrst, 'reload schema';
