-- Eliminar la restricción actual que limita las horas de reserva
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS valid_time_range;

-- Crear nueva restricción que permita reservas desde las 06:00 hasta las 23:00
-- (basado en las configuraciones del frontend que muestran desde 06:00 a 22:00)
ALTER TABLE public.bookings ADD CONSTRAINT valid_time_range 
CHECK (
  EXTRACT(hour FROM start_time) >= 6 
  AND EXTRACT(hour FROM end_time) <= 23
  AND start_time < end_time
);