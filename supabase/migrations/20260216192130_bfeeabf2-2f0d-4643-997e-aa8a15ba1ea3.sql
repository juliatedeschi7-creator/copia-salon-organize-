
-- Services table: what the salon offers
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  price NUMERIC(10,2) DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view salon services" ON public.services
  FOR SELECT USING (public.is_salon_member(auth.uid(), salon_id));

CREATE POLICY "Owner can manage services" ON public.services
  FOR ALL USING (public.is_salon_owner(auth.uid(), salon_id));

CREATE POLICY "Admin can view all services" ON public.services
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Available slots: owner-defined time slots for specific services/days
CREATE TABLE public.available_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.available_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view salon slots" ON public.available_slots
  FOR SELECT USING (public.is_salon_member(auth.uid(), salon_id));

CREATE POLICY "Owner can manage slots" ON public.available_slots
  FOR ALL USING (public.is_salon_owner(auth.uid(), salon_id));

-- Appointments table
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  client_user_id UUID NOT NULL,
  service_id UUID NOT NULL REFERENCES public.services(id),
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'recusado', 'cancelado', 'concluido')),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Clients can view their own appointments
CREATE POLICY "Clients can view own appointments" ON public.appointments
  FOR SELECT USING (client_user_id = auth.uid());

-- Clients can create appointments in salons they belong to
CREATE POLICY "Clients can create appointments" ON public.appointments
  FOR INSERT WITH CHECK (
    client_user_id = auth.uid() 
    AND public.is_salon_member(auth.uid(), salon_id)
  );

-- Salon members can view all salon appointments
CREATE POLICY "Members can view salon appointments" ON public.appointments
  FOR SELECT USING (public.is_salon_member(auth.uid(), salon_id));

-- Owner can update appointments (approve/reject)
CREATE POLICY "Owner can update appointments" ON public.appointments
  FOR UPDATE USING (public.is_salon_owner(auth.uid(), salon_id));

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'novo_agendamento', 'agendamento_aprovado', 'agendamento_recusado'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  reference_id UUID, -- appointment id
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Members can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (public.is_salon_member(auth.uid(), salon_id));

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
