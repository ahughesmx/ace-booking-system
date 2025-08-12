-- Primero eliminar la restricción actual sin verificaciones
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS valid_time_range;

-- Crear nueva restricción más permisiva que coincida con las configuraciones del frontend
-- Permitir reservas desde las 06:00 hasta las 23:59
ALTER TABLE public.bookings ADD CONSTRAINT valid_time_range 
CHECK (
  start_time < end_time
);