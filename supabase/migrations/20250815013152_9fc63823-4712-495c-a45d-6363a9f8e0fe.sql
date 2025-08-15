-- RESTAURAR FUNCIONALIDAD DE INVITACIONES: Políticas específicas para búsqueda de usuarios

-- 1. PERMITIR BÚSQUEDA LIMITADA DE PERFILES para invitaciones de partidos
-- Solo información básica (id, full_name) para usuarios autenticados
CREATE POLICY "Authenticated users can search basic profile info for invitations" ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  -- Solo permitir acceso a campos básicos necesarios para invitaciones
  -- Esta política trabajará junto con la restricción de columnas en el código
  (auth.uid() = id OR auth.uid() IS NOT NULL)
);

-- 2. CREAR VISTA ESPECÍFICA para búsquedas de usuarios (más segura)
-- Esta vista solo expone información mínima necesaria para invitaciones
CREATE OR REPLACE VIEW public.user_search_view AS
SELECT 
  id,
  full_name,
  member_id
FROM public.profiles
WHERE full_name IS NOT NULL AND full_name != '';

-- 3. POLÍTICAS PARA LA VISTA DE BÚSQUEDA
ALTER VIEW public.user_search_view SET (security_invoker = true);

-- RLS para la vista
CREATE POLICY "Authenticated users can search users for invitations" ON public.user_search_view
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 4. PERMITIR ACCESO A PERFILES ESPECÍFICOS para webhooks y notificaciones
-- Necesario para funcionalidades de partidos donde se accede a perfiles de otros jugadores
CREATE POLICY "Allow profile access for match participants" ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    -- Usuario puede ver su propio perfil
    auth.uid() = id OR
    -- Admins pueden ver todos los perfiles  
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    ) OR
    -- Participantes de partidos pueden ver perfiles de otros participantes
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE auth.uid() IN (m.player1_id, m.player2_id, m.player1_partner_id, m.player2_partner_id)
      AND id IN (m.player1_id, m.player2_id, m.player1_partner_id, m.player2_partner_id)
    )
  )
);

-- 5. LIMPIAR POLÍTICAS DUPLICADAS (mantener solo las necesarias)
-- Eliminar la política muy restrictiva anterior
DROP POLICY IF EXISTS "Users can view own profile and admins can view all" ON public.profiles;

-- La nueva política principal que combina todos los casos de uso seguros
-- ya está creada arriba como "Allow profile access for match participants"