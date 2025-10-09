-- Permitir a usuarios autenticados ver todas las reservas por transparencia
-- Los usuarios deben poder ver las reservas del día para saber qué canchas están ocupadas

-- Eliminar políticas restrictivas duplicadas en bookings
DROP POLICY IF EXISTS "Family members and admins can view bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can view bookings based on ownership and roles" ON public.bookings;

-- Nueva política: todos los usuarios autenticados pueden ver todas las reservas
CREATE POLICY "Authenticated users can view all bookings for transparency"
ON public.bookings
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Mantener políticas restrictivas para operaciones de escritura (ya existen)
-- UPDATE y DELETE siguen siendo solo para dueños, familia y admins

-- También permitir ver todas las special_bookings a usuarios autenticados
DROP POLICY IF EXISTS "Authenticated users can view special bookings" ON public.special_bookings;

CREATE POLICY "Authenticated users can view all special bookings for transparency"
ON public.special_bookings
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Documentación
COMMENT ON POLICY "Authenticated users can view all bookings for transparency" ON public.bookings IS 
'Permite a todos los usuarios autenticados ver todas las reservas por motivos de transparencia. Solo pueden modificar/cancelar sus propias reservas o las de su familia.';

COMMENT ON POLICY "Authenticated users can view all special bookings for transparency" ON public.special_bookings IS 
'Permite a todos los usuarios autenticados ver todas las reservas especiales (eventos, torneos, clases) por transparencia.';