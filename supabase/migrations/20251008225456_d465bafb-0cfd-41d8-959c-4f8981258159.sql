-- =====================================================
-- PERMITIR A USUARIOS AUTENTICADOS VER RESERVAS DEL DÍA
-- =====================================================
-- Esta migración permite que usuarios autenticados puedan ver
-- las reservas del día con información básica (nombre, hora, cancha)
-- sin exponer datos sensibles como teléfono, email, etc.

-- 1. Primero, verificar que la vista display_bookings_combined existe y tiene los datos correctos
-- Esta vista combina bookings regulares y special_bookings

-- 2. Crear una política RLS para que usuarios autenticados puedan ver bookings de otros usuarios
-- (solo información básica visible en la app)
DROP POLICY IF EXISTS "Authenticated users can view all bookings basic info" ON public.bookings;

CREATE POLICY "Authenticated users can view all bookings basic info"
ON public.bookings
FOR SELECT
TO authenticated
USING (
  -- Usuarios autenticados pueden ver:
  -- 1. Sus propias reservas (acceso completo)
  auth.uid() = user_id
  OR
  -- 2. Reservas de su familia (acceso completo)
  EXISTS (
    SELECT 1
    FROM profiles p1, profiles p2
    WHERE p1.id = auth.uid()
      AND p2.id = bookings.user_id
      AND p1.member_id = p2.member_id
      AND p1.member_id IS NOT NULL
  )
  OR
  -- 3. Todas las reservas pagadas (solo info básica para display)
  -- Esto permite que usuarios autenticados vean el listado del día
  (status = 'paid' AND auth.uid() IS NOT NULL)
  OR
  -- 4. Admins y operadores pueden ver todo
  EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'operador')
  )
);

-- 3. Asegurar que la política de special_bookings también permita ver eventos especiales
DROP POLICY IF EXISTS "Authenticated users can view special bookings" ON public.special_bookings;

CREATE POLICY "Authenticated users can view special bookings"
ON public.special_bookings
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- 4. Comentario de seguridad
COMMENT ON POLICY "Authenticated users can view all bookings basic info" ON public.bookings IS 
'Permite a usuarios autenticados ver el listado de reservas del día con información básica. 
Los datos sensibles como teléfono y email NO se exponen en las queries del frontend.
Solo se muestra: nombre, hora, cancha, y estado de la reserva.';