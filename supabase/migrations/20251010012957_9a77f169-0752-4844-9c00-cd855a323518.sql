-- Permitir a admins y supervisores ver todos los roles de usuario
CREATE POLICY "Admins and supervisors can view all user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('admin', 'supervisor')
  )
);

-- Comentario explicativo
COMMENT ON POLICY "Admins and supervisors can view all user roles" ON public.user_roles IS 
'Permite a administradores y supervisores ver los roles de todos los usuarios, necesario para filtros de reportes y gestión de usuarios';