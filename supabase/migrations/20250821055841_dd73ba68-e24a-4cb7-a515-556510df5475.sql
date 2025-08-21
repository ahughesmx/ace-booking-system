-- 1. Actualizar timeout de pago de 10 a 5 minutos
UPDATE public.payment_settings 
SET payment_timeout_minutes = 5 
WHERE payment_timeout_minutes = 10;

-- 2. Modificar función validate_booking para cancelar reservas pendientes anteriores del mismo usuario
CREATE OR REPLACE FUNCTION public.validate_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  booking_rules_rec record;
  court_settings_rec record;
  user_active_bookings integer;
  existing_booking_count integer;
  overlapping_user_bookings_count integer;
  court_type_name text;
  time_between_formatted text;
  canceled_count integer;
BEGIN
  -- NUEVA FUNCIONALIDAD: Cancelar automáticamente cualquier reserva pendiente anterior del mismo usuario
  DELETE FROM public.bookings 
  WHERE user_id = NEW.user_id 
    AND status = 'pending_payment'
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  
  GET DIAGNOSTICS canceled_count = ROW_COUNT;
  
  IF canceled_count > 0 THEN
    RAISE LOG 'Canceled % previous pending bookings for user %', canceled_count, NEW.user_id;
  END IF;

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
  
  -- VALIDACIÓN DINÁMICA DE RESERVAS CONSECUTIVAS Y TIEMPO ENTRE RESERVAS
  IF NOT booking_rules_rec.allow_consecutive_bookings OR booking_rules_rec.time_between_bookings > INTERVAL '0' THEN
    -- Contar reservas del mismo usuario que puedan violar las reglas dinámicas
    SELECT COUNT(*) INTO overlapping_user_bookings_count
    FROM public.bookings
    WHERE user_id = NEW.user_id  -- Mismo usuario
      AND court_id = NEW.court_id  -- Misma cancha
      AND status IN ('paid', 'pending_payment')  -- Solo reservas activas
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)  -- Excluir la reserva actual
      AND (
        -- Caso 1: Reservas consecutivas (solo si están prohibidas)
        (NOT booking_rules_rec.allow_consecutive_bookings AND (
          (end_time = NEW.start_time) OR  -- Reserva anterior termina cuando empieza la nueva
          (start_time = NEW.end_time)     -- Reserva posterior empieza cuando termina la nueva
        ))
        OR
        -- Caso 2: Reservas muy cercanas (solo si hay tiempo mínimo configurado)
        (booking_rules_rec.time_between_bookings > INTERVAL '0' AND (
          -- Nueva reserva muy cerca del final de una existente
          (end_time <= NEW.start_time AND end_time > (NEW.start_time - booking_rules_rec.time_between_bookings))
          OR
          -- Nueva reserva muy cerca del inicio de una existente  
          (start_time >= NEW.end_time AND start_time < (NEW.end_time + booking_rules_rec.time_between_bookings))
        ))
      );
    
    -- Generar mensaje de error dinámico basado en las reglas configuradas
    IF overlapping_user_bookings_count > 0 THEN
      -- Formatear el intervalo de tiempo de manera legible
      SELECT CASE 
        WHEN EXTRACT(HOUR FROM booking_rules_rec.time_between_bookings) > 0 THEN
          EXTRACT(HOUR FROM booking_rules_rec.time_between_bookings)::text || ' hora(s)'
        WHEN EXTRACT(MINUTE FROM booking_rules_rec.time_between_bookings) > 0 THEN
          EXTRACT(MINUTE FROM booking_rules_rec.time_between_bookings)::text || ' minuto(s)'
        ELSE
          booking_rules_rec.time_between_bookings::text
      END INTO time_between_formatted;
      
      -- Mensaje específico según las reglas configuradas
      IF NOT booking_rules_rec.allow_consecutive_bookings AND booking_rules_rec.time_between_bookings > INTERVAL '0' THEN
        -- Ambas restricciones activas
        RAISE EXCEPTION 'Las reservas consecutivas no están permitidas para canchas de %. Debe haber al menos % entre tus reservas en la misma cancha.', 
          court_type_name, time_between_formatted;
      ELSIF NOT booking_rules_rec.allow_consecutive_bookings THEN
        -- Solo reservas consecutivas prohibidas
        RAISE EXCEPTION 'Las reservas consecutivas no están permitidas para canchas de %.', 
          court_type_name;
      ELSE
        -- Solo tiempo mínimo entre reservas
        RAISE EXCEPTION 'Debe haber al menos % entre tus reservas en la misma cancha (tipo: %).', 
          time_between_formatted, court_type_name;
      END IF;
    END IF;
  END IF;
  
  -- Verificar límite dinámico de reservas activas del usuario
  SELECT COUNT(*) INTO user_active_bookings
  FROM public.bookings
  WHERE user_id = NEW.user_id
    AND status = 'paid'
    AND end_time > now()
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  
  IF user_active_bookings >= booking_rules_rec.max_active_bookings THEN
    RAISE EXCEPTION 'El usuario ha alcanzado el límite máximo de % reservas activas para canchas de %', 
      booking_rules_rec.max_active_bookings, court_type_name;
  END IF;
  
  -- Check for overlapping bookings (cualquier usuario)
  SELECT COUNT(*) INTO existing_booking_count
  FROM public.bookings
  WHERE court_id = NEW.court_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND status IN ('paid', 'pending_payment')
    AND (
      (start_time <= NEW.start_time AND end_time > NEW.start_time) OR
      (start_time < NEW.end_time AND end_time >= NEW.end_time) OR
      (start_time >= NEW.start_time AND end_time <= NEW.end_time)
    );
  
  IF existing_booking_count > 0 THEN
    RAISE EXCEPTION 'La cancha ya está reservada para este horario';
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. Actualizar frecuencia del cron job de limpieza a cada 3 minutos
SELECT cron.unschedule('cleanup-expired-bookings-frequent');

SELECT cron.schedule(
  'cleanup-expired-bookings-frequent',
  '*/3 * * * *', -- Cada 3 minutos en lugar de 5
  $$
  SELECT
    net.http_post(
        url:='https://bpjinatcgdmxqetfxjji.supabase.co/functions/v1/cleanup-expired-bookings',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwamluYXRjZ2RteHFldGZ4amppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU5NDU1NTgsImV4cCI6MjA1MTUyMTU1OH0.79yLPqxNagQqouMrbfCyfLeaEeg3TesEqQsrR9H_ZvQ"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);