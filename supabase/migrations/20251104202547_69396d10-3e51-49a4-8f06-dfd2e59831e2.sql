-- Eliminar el constraint antiguo de event_type
ALTER TABLE special_bookings 
DROP CONSTRAINT IF EXISTS special_bookings_event_type_check;

-- Agregar el nuevo constraint que incluye 'horario_domingo'
ALTER TABLE special_bookings 
ADD CONSTRAINT special_bookings_event_type_check 
CHECK (event_type = ANY (ARRAY['torneo'::text, 'clases'::text, 'eventos'::text, 'horario_domingo'::text]));