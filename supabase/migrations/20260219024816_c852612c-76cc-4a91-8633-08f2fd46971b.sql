
-- Tabelas de Anamnese
CREATE TABLE IF NOT EXISTS public.anamnesis_forms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  title text NOT NULL,
  service_type text NOT NULL DEFAULT 'geral',
  description text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.anamnesis_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id uuid NOT NULL REFERENCES public.anamnesis_forms(id) ON DELETE CASCADE,
  salon_id uuid NOT NULL,
  text text NOT NULL,
  question_type text NOT NULL DEFAULT 'text', -- 'text', 'boolean', 'select'
  options jsonb DEFAULT '[]'::jsonb,
  position integer NOT NULL DEFAULT 0,
  is_required boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.anamnesis_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id uuid NOT NULL REFERENCES public.anamnesis_forms(id) ON DELETE CASCADE,
  salon_id uuid NOT NULL,
  client_user_id uuid NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  answered_at timestamp with time zone NOT NULL DEFAULT now(),
  form_version integer NOT NULL DEFAULT 1
);

-- RLS para anamnesis_forms
ALTER TABLE public.anamnesis_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage anamnesis forms"
  ON public.anamnesis_forms FOR ALL
  USING (is_salon_owner(auth.uid(), salon_id));

CREATE POLICY "Members can view anamnesis forms"
  ON public.anamnesis_forms FOR SELECT
  USING (is_salon_member(auth.uid(), salon_id));

-- RLS para anamnesis_questions
ALTER TABLE public.anamnesis_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage anamnesis questions"
  ON public.anamnesis_questions FOR ALL
  USING (is_salon_owner(auth.uid(), salon_id));

CREATE POLICY "Members can view anamnesis questions"
  ON public.anamnesis_questions FOR SELECT
  USING (is_salon_member(auth.uid(), salon_id));

-- RLS para anamnesis_responses
ALTER TABLE public.anamnesis_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can insert own responses"
  ON public.anamnesis_responses FOR INSERT
  WITH CHECK (client_user_id = auth.uid() AND is_salon_member(auth.uid(), salon_id));

CREATE POLICY "Clients can view own responses"
  ON public.anamnesis_responses FOR SELECT
  USING (client_user_id = auth.uid());

CREATE POLICY "Owner can view salon responses"
  ON public.anamnesis_responses FOR SELECT
  USING (is_salon_owner(auth.uid(), salon_id));

-- Triggers updated_at
CREATE TRIGGER update_anamnesis_forms_updated_at
  BEFORE UPDATE ON public.anamnesis_forms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket para logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('salon-logos', 'salon-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'salon-logos');

CREATE POLICY "Owners can upload salon logo"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'salon-logos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Owners can update salon logo"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'salon-logos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Owners can delete salon logo"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'salon-logos' AND auth.uid() IS NOT NULL);
