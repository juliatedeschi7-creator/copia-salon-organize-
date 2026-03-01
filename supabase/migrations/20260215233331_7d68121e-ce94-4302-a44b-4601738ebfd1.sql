
-- Salons table (each tenant)
CREATE TABLE public.salons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL DEFAULT '',
  description text DEFAULT '',
  address text DEFAULT '',
  phone text DEFAULT '',
  logo_url text,
  client_link text UNIQUE DEFAULT gen_random_uuid()::text,
  primary_color text DEFAULT '#c0365d',
  accent_color text DEFAULT '#e67e22',
  notifications_enabled boolean DEFAULT true,
  working_hours jsonb DEFAULT '[
    {"day":"Segunda","enabled":true,"open":"09:00","close":"19:00"},
    {"day":"Terça","enabled":true,"open":"09:00","close":"19:00"},
    {"day":"Quarta","enabled":true,"open":"09:00","close":"19:00"},
    {"day":"Quinta","enabled":true,"open":"09:00","close":"19:00"},
    {"day":"Sexta","enabled":true,"open":"09:00","close":"19:00"},
    {"day":"Sábado","enabled":true,"open":"09:00","close":"16:00"},
    {"day":"Domingo","enabled":false,"open":"09:00","close":"13:00"}
  ]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.salons ENABLE ROW LEVEL SECURITY;

-- Salon members (dono, funcionario linked to a salon)
CREATE TABLE public.salon_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('dono', 'funcionario')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(salon_id, user_id)
);

ALTER TABLE public.salon_members ENABLE ROW LEVEL SECURITY;

-- Clients belong to a salon, NOT to auth.users
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  email text DEFAULT '',
  phone text DEFAULT '',
  birth_date date,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Helper: check if user is member of a salon
CREATE OR REPLACE FUNCTION public.is_salon_member(_user_id uuid, _salon_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.salon_members
    WHERE user_id = _user_id AND salon_id = _salon_id
  )
$$;

-- Helper: check if user is owner of a salon
CREATE OR REPLACE FUNCTION public.is_salon_owner(_user_id uuid, _salon_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.salon_members
    WHERE user_id = _user_id AND salon_id = _salon_id AND role = 'dono'
  )
$$;

-- RLS: salons
CREATE POLICY "Admin can view all salons" ON public.salons FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Members can view own salon" ON public.salons FOR SELECT USING (is_salon_member(auth.uid(), id));
CREATE POLICY "Approved users can create salons" ON public.salons FOR INSERT WITH CHECK (is_approved(auth.uid()) AND owner_id = auth.uid());
CREATE POLICY "Owner can update own salon" ON public.salons FOR UPDATE USING (is_salon_owner(auth.uid(), id));
CREATE POLICY "Admin can delete salons" ON public.salons FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- RLS: salon_members
CREATE POLICY "Admin can view all members" ON public.salon_members FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Members can view salon members" ON public.salon_members FOR SELECT USING (is_salon_member(auth.uid(), salon_id));
CREATE POLICY "Owner can manage members" ON public.salon_members FOR ALL USING (is_salon_owner(auth.uid(), salon_id));
CREATE POLICY "User can insert self as owner" ON public.salon_members FOR INSERT WITH CHECK (user_id = auth.uid() AND role = 'dono');

-- RLS: clients (isolated per salon, managed by owner/staff)
CREATE POLICY "Admin can view all clients" ON public.clients FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Salon members can view clients" ON public.clients FOR SELECT USING (is_salon_member(auth.uid(), salon_id));
CREATE POLICY "Owner can manage clients" ON public.clients FOR ALL USING (is_salon_owner(auth.uid(), salon_id));
CREATE POLICY "Staff can insert clients" ON public.clients FOR INSERT WITH CHECK (is_salon_member(auth.uid(), salon_id));
CREATE POLICY "Staff can update clients" ON public.clients FOR UPDATE USING (is_salon_member(auth.uid(), salon_id));

-- Triggers for updated_at
CREATE TRIGGER update_salons_updated_at BEFORE UPDATE ON public.salons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
