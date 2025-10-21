-- Add DELETE policy for user_registration_requests table
-- This allows admins and operators to delete registration requests

CREATE POLICY "Admins y operadores pueden eliminar solicitudes"
ON public.user_registration_requests
FOR DELETE
USING (public.is_admin_or_operator());