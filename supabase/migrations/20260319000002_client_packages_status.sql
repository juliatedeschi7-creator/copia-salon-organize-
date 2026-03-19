-- Add CHECK constraint to client_packages.status and update default to 'contratado'
-- Existing rows with 'ativo' remain valid as it is included in the new constraint.

ALTER TABLE public.client_packages
  DROP CONSTRAINT IF EXISTS client_packages_status_check;

ALTER TABLE public.client_packages
  ADD CONSTRAINT client_packages_status_check
    CHECK (status IN ('contratado', 'ativo', 'finalizado', 'cancelado'));

-- New assignments start as 'contratado' (paid/contracted, sessions not yet started)
ALTER TABLE public.client_packages
  ALTER COLUMN status SET DEFAULT 'contratado';

NOTIFY pgrst, 'reload schema';
