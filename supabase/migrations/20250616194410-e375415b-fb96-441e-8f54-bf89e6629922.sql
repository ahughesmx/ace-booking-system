
-- Modificar la tabla booking_rules para incluir configuración por tipo de cancha
ALTER TABLE public.booking_rules 
ADD COLUMN court_type TEXT CHECK (court_type IN ('tennis', 'padel'));

-- Hacer que court_type sea único para evitar duplicados
ALTER TABLE public.booking_rules 
ADD CONSTRAINT unique_court_type UNIQUE (court_type);

-- Actualizar la regla existente para que sea para tennis
UPDATE public.booking_rules 
SET court_type = 'tennis' 
WHERE court_type IS NULL;

-- Hacer court_type NOT NULL después de la actualización
ALTER TABLE public.booking_rules 
ALTER COLUMN court_type SET NOT NULL;

-- Insertar reglas por defecto para pádel
INSERT INTO public.booking_rules (
  court_type,
  max_active_bookings,
  min_cancellation_time,
  allow_consecutive_bookings,
  time_between_bookings,
  max_days_ahead
) VALUES (
  'padel',
  4,
  '24:00:00'::interval,
  false,
  '01:00:00'::interval,
  7
);
