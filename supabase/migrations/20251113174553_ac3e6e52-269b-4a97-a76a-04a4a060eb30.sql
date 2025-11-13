-- Actualizar políticas RLS de special_bookings para incluir supervisores

-- Eliminar políticas restrictivas existentes (solo admins)
DROP POLICY IF EXISTS "Only admins can create special bookings" ON special_bookings;
DROP POLICY IF EXISTS "Only admins can update special bookings" ON special_bookings;
DROP POLICY IF EXISTS "Only admins can delete special bookings" ON special_bookings;

-- Crear nuevas políticas que incluyen tanto admins como supervisores
CREATE POLICY "Admins and supervisors can create special bookings"
ON special_bookings FOR INSERT
TO authenticated
WITH CHECK (is_admin_or_supervisor());

CREATE POLICY "Admins and supervisors can update special bookings"
ON special_bookings FOR UPDATE
TO authenticated
USING (is_admin_or_supervisor())
WITH CHECK (is_admin_or_supervisor());

CREATE POLICY "Admins and supervisors can delete special bookings"
ON special_bookings FOR DELETE
TO authenticated
USING (is_admin_or_supervisor());