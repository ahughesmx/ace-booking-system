CREATE POLICY "Supervisor can SELECT valid_member_ids"
ON public.valid_member_ids
FOR SELECT
TO authenticated
USING (public.is_supervisor());