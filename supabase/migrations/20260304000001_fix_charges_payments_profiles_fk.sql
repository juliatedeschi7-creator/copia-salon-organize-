-- Add FK constraints so PostgREST can join charges and payments to profiles
-- Idempotent: only adds constraints if they don't already exist

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'charges_client_user_id_fkey_profiles'
      AND table_name = 'charges'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.charges
      ADD CONSTRAINT charges_client_user_id_fkey_profiles
      FOREIGN KEY (client_user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'payments_client_user_id_fkey_profiles'
      AND table_name = 'payments'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_client_user_id_fkey_profiles
      FOREIGN KEY (client_user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
