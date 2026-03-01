
-- Add reminder_hours config to salons (array of integers representing hours before appointment)
ALTER TABLE public.salons 
ADD COLUMN IF NOT EXISTS reminder_hours jsonb DEFAULT '[24, 2]'::jsonb;
