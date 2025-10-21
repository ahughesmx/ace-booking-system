-- Restrict deletion of registration requests to admins only
DROP POLICY IF EXISTS "Admins y operadores pueden eliminar solicitudes" ON public.user_registration_requests;

CREATE POLICY "Solo admins pueden eliminar solicitudes"
ON public.user_registration_requests
FOR DELETE
USING (public.is_admin());