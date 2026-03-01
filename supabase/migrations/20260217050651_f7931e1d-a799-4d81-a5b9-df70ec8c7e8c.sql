-- Allow salon owners to delete appointments
CREATE POLICY "Owner can delete appointments"
ON public.appointments FOR DELETE TO authenticated
USING (is_salon_owner(auth.uid(), salon_id));

NOTIFY pgrst, 'reload schema';