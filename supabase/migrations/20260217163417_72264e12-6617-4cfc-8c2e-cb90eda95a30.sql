
-- Packages defined by salon owner
CREATE TABLE public.packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  total_sessions INTEGER NOT NULL DEFAULT 1,
  price NUMERIC DEFAULT 0,
  validity_days INTEGER NOT NULL DEFAULT 30,
  rules TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view salon packages" ON public.packages
  FOR SELECT TO authenticated
  USING (is_salon_member(auth.uid(), salon_id));

CREATE POLICY "Owner can manage packages" ON public.packages
  FOR ALL TO authenticated
  USING (is_salon_owner(auth.uid(), salon_id));

CREATE TRIGGER update_packages_updated_at
  BEFORE UPDATE ON public.packages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Client packages (purchased / assigned)
CREATE TABLE public.client_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  client_user_id UUID NOT NULL,
  sessions_used INTEGER NOT NULL DEFAULT 0,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own packages" ON public.client_packages
  FOR SELECT TO authenticated
  USING (client_user_id = auth.uid());

CREATE POLICY "Members can view salon client packages" ON public.client_packages
  FOR SELECT TO authenticated
  USING (is_salon_member(auth.uid(), salon_id));

CREATE POLICY "Owner can manage client packages" ON public.client_packages
  FOR ALL TO authenticated
  USING (is_salon_owner(auth.uid(), salon_id));

CREATE TRIGGER update_client_packages_updated_at
  BEFORE UPDATE ON public.client_packages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

NOTIFY pgrst, 'reload schema';
