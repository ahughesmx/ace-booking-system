-- Primero eliminar la política problemática
DROP POLICY IF EXISTS "Admins and supervisors can view all user roles" ON public.user_roles;

-- Crear función security definer para verificar si el usuario es admin o supervisor
CREATE OR REPLACE FUNCTION public.is_admin_or_supervisor()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'supervisor')
  );
$$;

-- Crear la política correcta usando la función security definer
CREATE POLICY "Admins and supervisors can view all user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  public.is_admin_or_supervisor()
);

-- Comentario explicativo
COMMENT ON FUNCTION public.is_admin_or_supervisor IS 
'Verifica si el usuario actual es admin o supervisor sin causar recursión en RLS';

COMMENT ON POLICY "Admins and supervisors can view all user roles" ON public.user_roles IS 
'Permite a administradores y supervisores ver los roles de todos los usuarios usando función security definer';