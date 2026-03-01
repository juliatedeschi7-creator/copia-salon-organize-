-- Multi-service package items
CREATE TABLE public.package_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (package_id, service_id)
);

ALTER TABLE public.package_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view package_items" ON public.package_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.packages p
      WHERE p.id = package_id
        AND is_salon_member(auth.uid(), p.salon_id)
    )
  );

CREATE POLICY "Owner can manage package_items" ON public.package_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.packages p
      WHERE p.id = package_id
        AND is_salon_owner(auth.uid(), p.salon_id)
    )
  );

-- Backfill existing single-service packages
INSERT INTO public.package_items (package_id, service_id, quantity)
SELECT id, service_id, total_sessions
FROM public.packages
WHERE service_id IS NOT NULL
ON CONFLICT (package_id, service_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
