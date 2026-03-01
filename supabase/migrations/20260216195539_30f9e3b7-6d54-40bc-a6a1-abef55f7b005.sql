-- Allow clients to cancel their own appointments
CREATE POLICY "Clients can cancel own appointments"
ON public.appointments
FOR UPDATE
USING (client_user_id = auth.uid())
WITH CHECK (status = 'cancelado');
