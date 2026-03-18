-- Remove demo/example dashboard data for salon "Espaço Maria Magnólia"
-- Salon id: 07312f15-27cf-4b60-817d-eb289073df99
-- This migration is idempotent (safe to run multiple times).

DO $$
DECLARE
  _salon_id uuid := '07312f15-27cf-4b60-817d-eb289073df99'::uuid;
BEGIN
  -- Delete notifications for this salon
  DELETE FROM public.notifications
  WHERE salon_id = _salon_id;

  -- Delete payments linked to charges for this salon
  DELETE FROM public.payments
  WHERE salon_id = _salon_id;

  -- Delete charges for this salon
  DELETE FROM public.charges
  WHERE salon_id = _salon_id;

  -- Delete client_package_items for client_packages of this salon
  DELETE FROM public.client_package_items
  WHERE client_package_id IN (
    SELECT id FROM public.client_packages WHERE salon_id = _salon_id
  );

  -- Delete client_packages for this salon
  DELETE FROM public.client_packages
  WHERE salon_id = _salon_id;

  -- Delete appointments for this salon
  DELETE FROM public.appointments
  WHERE salon_id = _salon_id;

END;
$$;
