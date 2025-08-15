-- Eliminar la política restrictiva actual
DROP POLICY IF EXISTS "Authenticated users can view interface preferences" ON interface_preferences;

-- Crear nueva política que permite acceso público para lectura
CREATE POLICY "Public can view interface preferences" 
ON interface_preferences 
FOR SELECT 
USING (true);

-- Mantener las políticas restrictivas para escritura (solo admins)
-- No necesitamos modificar las políticas de INSERT/UPDATE/DELETE ya que están correctas