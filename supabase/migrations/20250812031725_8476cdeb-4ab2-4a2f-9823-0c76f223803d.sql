-- Eliminar la restricción actual que es estática
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS valid_time_range;

-- Crear función para validar horarios basándose en court_type_settings
CREATE OR REPLACE FUNCTION public.validate_booking_time_with_settings()
RETURNS TRIGGER AS $$
DECLARE
  court_type_name text;
  settings_rec record;
  booking_hour integer;
  booking_end_hour integer;
  operating_start_hour integer;
  operating_end_hour integer;
BEGIN
  -- Obtener el tipo de cancha
  SELECT court_type INTO court_type_name
  FROM public.courts
  WHERE id = NEW.court_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Court not found';
  END IF;
  
  -- Obtener configuraciones para este tipo de cancha
  SELECT * INTO settings_rec
  FROM public.court_type_settings
  WHERE court_type = court_type_name;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Court type settings not found for %', court_type_name;
  END IF;
  
  -- Extraer horas de inicio y fin de la reserva
  booking_hour := EXTRACT(hour FROM NEW.start_time);
  booking_end_hour := EXTRACT(hour FROM NEW.end_time);
  
  -- Extraer horas de operación de la configuración
  operating_start_hour := EXTRACT(hour FROM settings_rec.operating_hours_start);
  operating_end_hour := EXTRACT(hour FROM settings_rec.operating_hours_end);
  
  -- Validar que la reserva esté dentro del horario de operación
  IF booking_hour < operating_start_hour THEN
    RAISE EXCEPTION 'Cannot book before operating hours. Operating hours for % start at %:00', 
      court_type_name, operating_start_hour;
  END IF;
  
  IF booking_end_hour > operating_end_hour THEN
    RAISE EXCEPTION 'Cannot book after operating hours. Operating hours for % end at %:00', 
      court_type_name, operating_end_hour;
  END IF;
  
  -- Validar que start_time < end_time
  IF NEW.start_time >= NEW.end_time THEN
    RAISE EXCEPTION 'Start time must be before end time';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- Crear trigger que valide los horarios basándose en la configuración
CREATE TRIGGER validate_booking_time_trigger
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_booking_time_with_settings();

-- Actualizar función de validación de booking para usar configuraciones dinámicas
CREATE OR REPLACE FUNCTION public.validate_booking()
RETURNS TRIGGER AS $$
DECLARE
  booking_rules_rec record;
  court_settings_rec record;
  user_active_bookings integer;
  existing_booking_count integer;
  court_type_name text;
BEGIN
  -- Obtener el tipo de cancha
  SELECT court_type INTO court_type_name
  FROM public.courts
  WHERE id = NEW.court_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Court not found';
  END IF;
  
  -- Get booking rules for the court type
  SELECT * INTO booking_rules_rec
  FROM public.booking_rules
  WHERE court_type = court_type_name
  LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No booking rules found for court type %', court_type_name;
  END IF;
  
  -- Get court type settings for advance booking validation
  SELECT * INTO court_settings_rec
  FROM public.court_type_settings
  WHERE court_type = court_type_name
  LIMIT 1;
  
  IF FOUND THEN
    -- Check if booking is too far in advance using court_type_settings
    IF NEW.start_time > (CURRENT_DATE + court_settings_rec.advance_booking_days * INTERVAL '1 day') THEN
      RAISE EXCEPTION 'Cannot book more than % days in advance for %', 
        court_settings_rec.advance_booking_days, court_type_name;
    END IF;
  ELSE
    -- Fallback to booking_rules if court_type_settings not found
    IF NEW.start_time > (CURRENT_DATE + booking_rules_rec.max_days_ahead * INTERVAL '1 day') THEN
      RAISE EXCEPTION 'Cannot book more than % days in advance for %', 
        booking_rules_rec.max_days_ahead, court_type_name;
    END IF;
  END IF;
  
  -- Check if booking is in the past
  IF NEW.start_time < now() THEN
    RAISE EXCEPTION 'Cannot book in the past';
  END IF;
  
  -- Check user's active bookings limit
  SELECT active_bookings INTO user_active_bookings
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  IF user_active_bookings >= booking_rules_rec.max_active_bookings THEN
    RAISE EXCEPTION 'User has reached maximum active bookings limit of % for %', 
      booking_rules_rec.max_active_bookings, court_type_name;
  END IF;
  
  -- Check for overlapping bookings
  SELECT COUNT(*) INTO existing_booking_count
  FROM public.bookings
  WHERE court_id = NEW.court_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND (
      (start_time <= NEW.start_time AND end_time > NEW.start_time) OR
      (start_time < NEW.end_time AND end_time >= NEW.end_time) OR
      (start_time >= NEW.start_time AND end_time <= NEW.end_time)
    );
  
  IF existing_booking_count > 0 THEN
    RAISE EXCEPTION 'Court is already booked for this time slot';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- Crear trigger para actualizar validaciones cuando cambien las configuraciones
CREATE OR REPLACE FUNCTION public.invalidate_booking_cache()
RETURNS TRIGGER AS $$
BEGIN
  -- Esta función se ejecuta cuando se actualizan court_type_settings
  -- Para notificar que las validaciones pueden haber cambiado
  NOTIFY court_settings_updated, 'Court type settings have been updated';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- Trigger para notificar cambios en configuraciones
CREATE TRIGGER court_settings_change_trigger
  AFTER UPDATE ON public.court_type_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.invalidate_booking_cache();