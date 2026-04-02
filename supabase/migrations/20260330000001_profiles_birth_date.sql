-- Add birth_date column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birth_date date;

-- The original RLS UPDATE policy uses `user_id = auth.uid()`.
-- After migration 20260325 the handle_new_user trigger now inserts profiles
-- with profiles.id = auth.users.id (not profiles.user_id), so `user_id` may
-- be NULL for newer accounts.  Update the policy to match on either column so
-- that any authenticated user can always update their own profile row.
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid() OR user_id = auth.uid());

NOTIFY pgrst, 'reload schema';
