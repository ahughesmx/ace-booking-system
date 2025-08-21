-- Actualizar la función validate_booking para incluir validación de reservas consecutivas y tiempo entre reservas
CREATE OR REPLACE FUNCTION public.validate_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  booking_rules_rec record;
  court_settings_rec record;
  user_active_bookings integer;
  existing_booking_count integer;
  overlapping_user_bookings_count integer;
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
  
  -- VALIDACIÓN DE RESERVAS CONSECUTIVAS Y TIEMPO ENTRE RESERVAS
  IF NOT booking_rules_rec.allow_consecutive_bookings OR booking_rules_rec.time_between_bookings > INTERVAL '0' THEN
    -- Contar reservas del mismo usuario que puedan violar las reglas
    SELECT COUNT(*) INTO overlapping_user_bookings_count
    FROM public.bookings
    WHERE user_id = NEW.user_id  -- Mismo usuario
      AND court_id = NEW.court_id  -- Misma cancha
      AND status IN ('paid', 'pending_payment')  -- Solo reservas activas
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)  -- Excluir la reserva actual
      AND (
        -- Caso 1: Reservas consecutivas (cuando están prohibidas)
        (NOT booking_rules_rec.allow_consecutive_bookings AND (
          (end_time = NEW.start_time) OR  -- Reserva anterior termina cuando empieza la nueva
          (start_time = NEW.end_time)     -- Reserva posterior empieza cuando termina la nueva
        ))
        OR
        -- Caso 2: Reservas muy cercanas (menor al tiempo mínimo requerido)
        (booking_rules_rec.time_between_bookings > INTERVAL '0' AND (
          -- Nueva reserva muy cerca del final de una existente
          (end_time <= NEW.start_time AND end_time > (NEW.start_time - booking_rules_rec.time_between_bookings))
          OR
          -- Nueva reserva muy cerca del inicio de una existente  
          (start_time >= NEW.end_time AND start_time < (NEW.end_time + booking_rules_rec.time_between_bookings))
        ))
      );
    
    IF overlapping_user_bookings_count > 0 THEN
      IF NOT booking_rules_rec.allow_consecutive_bookings THEN
        RAISE EXCEPTION 'Consecutive bookings are not allowed for court type %. There must be at least % between your bookings on the same court', 
          court_type_name, booking_rules_rec.time_between_bookings;
      ELSE
        RAISE EXCEPTION 'There must be at least % between your bookings on the same court (court type: %)', 
          booking_rules_rec.time_between_bookings, court_type_name;
      END IF;
    END IF;
  END IF;
  
  -- Verificar límite de reservas activas del usuario TITULAR
  SELECT COUNT(*) INTO user_active_bookings
  FROM public.bookings
  WHERE user_id = NEW.user_id  -- Usuario titular de la reserva
    AND status = 'paid'  -- Solo contar reservas pagadas como activas
    AND end_time > now()  -- Solo reservas que no hayan terminado
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);  -- Excluir la reserva actual
  
  IF user_active_bookings >= booking_rules_rec.max_active_bookings THEN
    RAISE EXCEPTION 'User has reached maximum active bookings limit of % for %', 
      booking_rules_rec.max_active_bookings, court_type_name;
  END IF;
  
  -- Check for overlapping bookings (cualquier usuario)
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