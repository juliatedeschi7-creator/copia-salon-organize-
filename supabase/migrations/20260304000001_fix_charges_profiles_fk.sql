-- Add FK from charges.client_user_id -> profiles.user_id so that
-- PostgREST can resolve the join charges->profiles used in ContasPage.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'charges_client_user_id_profiles_fkey'
      AND conrelid = 'public.charges'::regclass
  ) THEN
    ALTER TABLE public.charges
      ADD CONSTRAINT charges_client_user_id_profiles_fkey
      FOREIGN KEY (client_user_id) REFERENCES public.profiles(user_id);
  END IF;
END
$$;

NOTIFY pgrst, 'reload schema';
