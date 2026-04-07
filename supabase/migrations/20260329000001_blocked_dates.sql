-- Migration: blocked_dates table for date-specific full-day blocking
-- Allows salon owners/staff to block specific calendar dates (e.g., for weddings)

CREATE TABLE IF NOT EXISTS public.blocked_dates (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id     uuid        NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  blocked_date date        NOT NULL,
  reason       text,
  created_by   uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT blocked_dates_salon_date_key UNIQUE (salon_id, blocked_date)
);

ALTER TABLE public.blocked_dates ENABLE ROW LEVEL SECURITY;

-- Owners can manage blocked dates for their salon
DROP POLICY IF EXISTS "Owner can manage blocked_dates" ON public.blocked_dates;
CREATE POLICY "Owner can manage blocked_dates"
  ON public.blocked_dates
  FOR ALL
  TO authenticated
  USING (public.is_salon_owner(auth.uid(), salon_id))
  WITH CHECK (public.is_salon_owner(auth.uid(), salon_id));

-- Staff (funcionario) can also manage blocked dates
DROP POLICY IF EXISTS "Staff can manage blocked_dates" ON public.blocked_dates;
CREATE POLICY "Staff can manageu blocked_dates"
  ON public.blocked_dates
  FOR ALL
  TO authenticated
  USING (public.is_salon_member(auth.uid(), salon_id))
  WITH CHECK (public.is_salon_member(auth.uid(), salon_id));
