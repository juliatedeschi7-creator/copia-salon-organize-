-- Per-service usage tracking for client packages
CREATE TABLE public.client_package_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_package_id UUID NOT NULL REFERENCES public.client_packages(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  quantity_total INTEGER NOT NULL CHECK (quantity_total > 0),
  quantity_used INTEGER NOT NULL DEFAULT 0 CHECK (quantity_used >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_package_id, service_id)
);

ALTER TABLE public.client_package_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client can view own client_package_items" ON public.client_package_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_packages cp
      WHERE cp.id = client_package_id
        AND cp.client_user_id = auth.uid()
    )
  );

CREATE POLICY "Members can view client_package_items" ON public.client_package_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_packages cp
      WHERE cp.id = client_package_id
        AND is_salon_member(auth.uid(), cp.salon_id)
    )
  );

CREATE POLICY "Owner can manage client_package_items" ON public.client_package_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_packages cp
      WHERE cp.id = client_package_id
        AND is_salon_owner(auth.uid(), cp.salon_id)
    )
  );

NOTIFY pgrst, 'reload schema';
