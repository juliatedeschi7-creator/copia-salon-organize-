-- Charges table: amounts owed by clients to the salon
CREATE TABLE public.charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  client_user_id uuid NOT NULL,
  description text NOT NULL DEFAULT '',
  amount numeric(10,2) NOT NULL DEFAULT 0,
  due_date date,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado')),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage charges" ON public.charges
  FOR ALL USING (public.is_salon_owner(auth.uid(), salon_id));

CREATE POLICY "Client can view own charges" ON public.charges
  FOR SELECT USING (client_user_id = auth.uid());

CREATE POLICY "Admin can view all charges" ON public.charges
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_charges_updated_at
  BEFORE UPDATE ON public.charges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Payments table: recorded payments (may be linked to a charge)
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_id uuid REFERENCES public.charges(id) ON DELETE SET NULL,
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  client_user_id uuid NOT NULL,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text DEFAULT '',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage payments" ON public.payments
  FOR ALL USING (public.is_salon_owner(auth.uid(), salon_id));

CREATE POLICY "Client can view own payments" ON public.payments
  FOR SELECT USING (client_user_id = auth.uid());

CREATE POLICY "Admin can view all payments" ON public.payments
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Trigger: notify client when a new charge is created
CREATE OR REPLACE FUNCTION public.notify_client_on_charge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, salon_id, type, title, message, reference_id)
  VALUES (
    NEW.client_user_id,
    NEW.salon_id,
    'nova_cobranca',
    'Nova cobrança',
    'Você tem uma nova cobrança: ' || NEW.description || ' (R$ ' || to_char(NEW.amount, 'FM99999990.00') || ')',
    NEW.id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_on_charge_insert
  AFTER INSERT ON public.charges
  FOR EACH ROW EXECUTE FUNCTION public.notify_client_on_charge();

-- Trigger: notify client when a payment is recorded
CREATE OR REPLACE FUNCTION public.notify_client_on_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, salon_id, type, title, message, reference_id)
  VALUES (
    NEW.client_user_id,
    NEW.salon_id,
    'pagamento_registrado',
    'Pagamento registrado',
    'Seu pagamento de R$ ' || to_char(NEW.amount, 'FM99999990.00') || ' foi registrado.',
    NEW.id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_on_payment_insert
  AFTER INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.notify_client_on_payment();

NOTIFY pgrst, 'reload schema';
