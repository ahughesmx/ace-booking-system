-- Corregir la función de validación de horarios para manejar zonas horarias
CREATE OR REPLACE FUNCTION public.validate_booking_time_with_settings()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  court_type_name text;
  settings_rec record;
  booking_local_start timestamp;
  booking_local_end timestamp;
  booking_start_hour integer;
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
  
  -- Convertir las horas UTC a hora local de México (UTC-6)
  booking_local_start := NEW.start_time AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City';
  booking_local_end := NEW.end_time AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City';
  
  -- Extraer horas de la reserva en hora local
  booking_start_hour := EXTRACT(hour FROM booking_local_start);
  booking_end_hour := EXTRACT(hour FROM booking_local_end);
  
  -- Extraer horas de operación de la configuración
  operating_start_hour := EXTRACT(hour FROM settings_rec.operating_hours_start);
  operating_end_hour := EXTRACT(hour FROM settings_rec.operating_hours_end);
  
  -- Validar que la reserva esté dentro del horario de operación
  IF booking_start_hour < operating_start_hour THEN
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
$function$;