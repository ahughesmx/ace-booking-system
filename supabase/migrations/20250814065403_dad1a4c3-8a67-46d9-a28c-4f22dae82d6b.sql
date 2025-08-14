-- Corregir políticas RLS de bookings para permitir actualización por operadores
-- El problema es que el operador no puede actualizar reservas de otros usuarios

-- Eliminar política restrictiva actual
DROP POLICY IF EXISTS "Enable update for booking owners" ON public.bookings;
DROP POLICY IF EXISTS "bookings_update_policy" ON public.bookings;

-- Crear nueva política que permita a operadores/admins actualizar cualquier reserva
CREATE POLICY "bookings_update_enhanced" 
ON public.bookings 
FOR UPDATE 
USING (
  -- El propietario de la reserva puede actualizarla
  auth.uid() = user_id 
  OR 
  -- Los operadores y admins pueden actualizar cualquier reserva
  EXISTS (
    SELECT 1 
    FROM user_roles 
    WHERE user_id = auth.uid() 
      AND role IN ('admin', 'operador')
  )
);