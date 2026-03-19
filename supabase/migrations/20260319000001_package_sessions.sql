-- Package sessions: individual session records for client packages
CREATE TABLE IF NOT EXISTS public.package_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  client_user_id uuid NOT NULL,
  client_package_id uuid NOT NULL REFERENCES public.client_packages(id) ON DELETE CASCADE,
  service_id uuid NULL REFERENCES public.services(id) ON DELETE SET NULL,
  status text NOT NULL CHECK (status IN ('realizado', 'nao_avisou', 'avisou_menos_2h')),
  notes text NULL,
  performed_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.package_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage package_sessions" ON public.package_sessions
  FOR ALL USING (public.is_salon_owner(auth.uid(), salon_id));

CREATE POLICY "Client can view own package_sessions" ON public.package_sessions
  FOR SELECT USING (client_user_id = auth.uid());

NOTIFY pgrst, 'reload schema';
