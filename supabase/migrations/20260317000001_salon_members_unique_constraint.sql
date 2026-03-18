-- Ensure UNIQUE(salon_id, user_id) constraint exists on salon_members
-- Required for ON CONFLICT (salon_id, user_id) upserts in admin approval and accept_team_invite

DO $$
BEGIN
  -- Remove duplicate rows first (keep the most recently created one)
  -- so the UNIQUE constraint can be added safely
  DELETE FROM public.salon_members a
  USING public.salon_members b
  WHERE a.salon_id = b.salon_id
    AND a.user_id = b.user_id
    AND a.created_at < b.created_at;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'salon_members_salon_id_user_id_key'
      AND conrelid = 'public.salon_members'::regclass
  ) THEN
    ALTER TABLE public.salon_members
      ADD CONSTRAINT salon_members_salon_id_user_id_key UNIQUE (salon_id, user_id);
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
