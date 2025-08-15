-- RESTAURAR FUNCIONALIDAD DE INVITACIONES: Enfoque corregido

-- 1. LIMPIAR POLÍTICAS EXISTENTES PROBLEMÁTICAS
DROP POLICY IF EXISTS "Users can view own profile and admins can view all" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can search basic profile info for invitations" ON public.profiles;

-- 2. CREAR POLÍTICA PRINCIPAL que permite acceso seguro a perfiles
CREATE POLICY "Secure profile access for authenticated users" ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    -- Usuario puede ver su propio perfil completo
    auth.uid() = id OR
    -- Admins pueden ver todos los perfiles  
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    ) OR
    -- Usuarios autenticados pueden ver información básica de otros (solo nombres para búsquedas)
    -- Pero la aplicación debe limitar qué campos se exponen en las consultas
    (full_name IS NOT NULL AND full_name != '')
  )
);

-- 3. CREAR FUNCIÓN SEGURA para búsqueda de usuarios
CREATE OR REPLACE FUNCTION public.search_users_for_invitations(search_term text)
RETURNS TABLE (
  id uuid,
  full_name text,
  member_id text
) 
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Solo usuarios autenticados pueden usar esta función
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Access denied: user not authenticated';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.member_id
  FROM public.profiles p
  WHERE 
    p.full_name IS NOT NULL 
    AND p.full_name != ''
    AND p.id != auth.uid() -- Excluir al usuario actual
    AND (
      p.full_name ILIKE '%' || search_term || '%' OR
      p.member_id ILIKE '%' || search_term || '%'
    )
  ORDER BY p.full_name
  LIMIT 10;
END;
$$;

-- 4. DAR PERMISOS PARA USAR LA FUNCIÓN DE BÚSQUEDA
GRANT EXECUTE ON FUNCTION public.search_users_for_invitations(text) TO authenticated;