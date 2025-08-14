-- Corregir la función validate_booking para verificar límites del usuario titular, no del operador
CREATE OR REPLACE FUNCTION public.validate_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
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
  
  -- CORRECCIÓN: Verificar límite de reservas activas del usuario TITULAR (NEW.user_id), no del operador
  -- Contar reservas activas del usuario titular que no hayan expirado
  SELECT COUNT(*) INTO user_active_bookings
  FROM public.bookings
  WHERE user_id = NEW.user_id  -- Este es el usuario titular de la reserva
    AND status = 'paid'  -- Solo contar reservas pagadas como activas
    AND end_time > now()  -- Solo reservas que no hayan terminado
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);  -- Excluir la reserva actual si es una actualización
  
  IF user_active_bookings >= booking_rules_rec.max_active_bookings THEN
    RAISE EXCEPTION 'User has reached maximum active bookings limit of % for %', 
      booking_rules_rec.max_active_bookings, court_type_name;
  END IF;
  
  -- Check for overlapping bookings
  SELECT COUNT(*) INTO existing_booking_count
  FROM public.bookings
  WHERE court_id = NEW.court_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND status IN ('paid', 'pending_payment')  -- Incluir reservas pagadas y pendientes
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
$function$;