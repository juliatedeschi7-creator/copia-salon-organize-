-- Fix: add FK from salon_members.user_id to profiles.user_id so PostgREST
-- can resolve the join used in ClientesPage (.select("user_id, profiles(...)"))

-- 1. Drop the old role CHECK constraint (only allows 'dono', 'funcionario')
--    and recreate it to also allow 'cliente'.
ALTER TABLE public.salon_members
  DROP CONSTRAINT IF EXISTS salon_members_role_check;

ALTER TABLE public.salon_members
  ADD CONSTRAINT salon_members_role_check
    CHECK (role IN ('dono', 'funcionario', 'cliente'));

-- 2. Add FK: salon_members.user_id -> profiles.user_id
--    profiles.user_id is UNIQUE (auth user id), making it a valid FK target.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.salon_members'::regclass
      AND conname = 'salon_members_user_id_fkey_profiles'
  ) THEN
    ALTER TABLE public.salon_members
      ADD CONSTRAINT salon_members_user_id_fkey_profiles
        FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- Force PostgREST to reload its schema cache so the new FK is picked up.
NOTIFY pgrst, 'reload schema';
