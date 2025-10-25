-- Agregar política para permitir a usuarios autenticados ver reservas pagadas por transparencia
-- Esto permite que los usuarios vean qué horarios están ocupados al hacer nuevas reservas

CREATE POLICY "Authenticated users can view all paid bookings for transparency"
ON public.bookings
FOR SELECT
TO authenticated
USING (status = 'paid');

-- Comentario explicativo
COMMENT ON POLICY "Authenticated users can view all paid bookings for transparency" ON public.bookings IS 
'Permite a usuarios autenticados ver todas las reservas pagadas para transparencia y facilitar el proceso de nuevas reservas. Los usuarios necesitan ver qué slots están ocupados por otros usuarios.';