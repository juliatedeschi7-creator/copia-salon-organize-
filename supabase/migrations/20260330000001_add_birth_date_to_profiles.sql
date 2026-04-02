-- Add birth_date column to profiles table (idempotent)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birth_date date NULL;
