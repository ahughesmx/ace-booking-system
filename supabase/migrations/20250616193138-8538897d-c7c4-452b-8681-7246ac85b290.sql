
-- Crear tabla para configuraciones específicas por tipo de cancha
CREATE TABLE public.court_type_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  court_type TEXT NOT NULL CHECK (court_type IN ('tennis', 'padel')),
  operating_hours_start TIME NOT NULL DEFAULT '08:00:00',
  operating_hours_end TIME NOT NULL DEFAULT '22:00:00',
  min_booking_duration INTEGER NOT NULL DEFAULT 60, -- minutos
  max_booking_duration INTEGER NOT NULL DEFAULT 120, -- minutos
  default_booking_duration INTEGER NOT NULL DEFAULT 90, -- minutos
  price_per_hour DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  peak_hours_start TIME DEFAULT '18:00:00',
  peak_hours_end TIME DEFAULT '21:00:00',
  peak_hours_multiplier DECIMAL(3,2) DEFAULT 1.5,
  max_capacity INTEGER NOT NULL DEFAULT 4,
  advance_booking_days INTEGER NOT NULL DEFAULT 7,
  weekend_price_multiplier DECIMAL(3,2) DEFAULT 1.2,
  operating_days TEXT[] DEFAULT ARRAY['monday','tuesday','wednesday','thursday','friday','saturday','sunday'],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(court_type)
);

-- Insertar configuraciones por defecto para tenis
INSERT INTO public.court_type_settings (
  court_type,
  operating_hours_start,
  operating_hours_end,
  min_booking_duration,
  max_booking_duration,
  default_booking_duration,
  price_per_hour,
  peak_hours_start,
  peak_hours_end,
  peak_hours_multiplier,
  max_capacity,
  advance_booking_days,
  weekend_price_multiplier,
  operating_days
) VALUES (
  'tennis',
  '06:00:00',
  '23:00:00',
  60,
  120,
  90,
  25.00,
  '18:00:00',
  '21:00:00',
  1.5,
  4,
  7,
  1.2,
  ARRAY['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
);

-- Insertar configuraciones por defecto para pádel
INSERT INTO public.court_type_settings (
  court_type,
  operating_hours_start,
  operating_hours_end,
  min_booking_duration,
  max_booking_duration,
  default_booking_duration,
  price_per_hour,
  peak_hours_start,
  peak_hours_end,
  peak_hours_multiplier,
  max_capacity,
  advance_booking_days,
  weekend_price_multiplier,
  operating_days
) VALUES (
  'padel',
  '07:00:00',
  '24:00:00',
  90,
  180,
  90,
  30.00,
  '19:00:00',
  '22:00:00',
  1.6,
  4,
  7,
  1.3,
  ARRAY['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
);

-- Crear trigger para actualizar updated_at
CREATE TRIGGER update_court_type_settings_updated_at
    BEFORE UPDATE ON public.court_type_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Habilitar RLS
ALTER TABLE public.court_type_settings ENABLE ROW LEVEL SECURITY;

-- Crear política para que solo admins puedan gestionar estas configuraciones
CREATE POLICY "Only admins can manage court type settings"
  ON public.court_type_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );
