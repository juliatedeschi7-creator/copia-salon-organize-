-- Fix: add FK from charges.client_user_id and payments.client_user_id to profiles.user_id
-- so PostgREST can resolve the join used in ContasPage (.select("*, profiles(...)"))

DO $$
BEGIN
  -- FK: charges.client_user_id -> profiles.user_id
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.charges'::regclass
      AND conname = 'charges_client_user_id_fkey_profiles'
  ) THEN
    ALTER TABLE public.charges
      ADD CONSTRAINT charges_client_user_id_fkey_profiles
        FOREIGN KEY (client_user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;

  -- FK: payments.client_user_id -> profiles.user_id
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.payments'::regclass
      AND conname = 'payments_client_user_id_fkey_profiles'
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_client_user_id_fkey_profiles
        FOREIGN KEY (client_user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- Force PostgREST to reload its schema cache so the new FKs are picked up.
NOTIFY pgrst, 'reload schema';
