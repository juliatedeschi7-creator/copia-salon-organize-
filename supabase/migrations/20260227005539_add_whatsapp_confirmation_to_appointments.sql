-- Add WhatsApp confirmation fields to appointments
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS whatsapp_code text,
  ADD COLUMN IF NOT EXISTS whatsapp_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS whatsapp_confirmed_by uuid;

-- Backfill existing rows with a short unique code
UPDATE public.appointments
SET whatsapp_code = upper(substr(md5(id::text || now()::text), 1, 6))
WHERE whatsapp_code IS NULL;

-- Make whatsapp_code NOT NULL with a generated default for new rows
ALTER TABLE public.appointments
  ALTER COLUMN whatsapp_code SET NOT NULL,
  ALTER COLUMN whatsapp_code SET DEFAULT upper(substr(md5(gen_random_uuid()::text), 1, 6));
