-- ARREGLAR TODAS LAS FUNCIONES RESTANTES con search_path seguro

-- 1. FUNCIÓN create_receipt_number
CREATE OR REPLACE FUNCTION public.create_receipt_number(p_booking_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_year INTEGER;
  next_sequential INTEGER;
  receipt_number TEXT;
BEGIN
  current_year := EXTRACT(year FROM now());
  
  -- Obtener el siguiente número secuencial para este año
  SELECT COALESCE(MAX(sequential_number), 0) + 1 
  INTO next_sequential
  FROM receipt_numbers 
  WHERE year = current_year;
  
  -- Generar el folio con formato COB-YYYY-NNNNN
  receipt_number := 'COB-' || current_year || '-' || LPAD(next_sequential::TEXT, 5, '0');
  
  -- Insertar el folio en la tabla
  INSERT INTO receipt_numbers (receipt_number, booking_id, year, sequential_number)
  VALUES (receipt_number, p_booking_id, current_year, next_sequential);
  
  RETURN receipt_number;
END;
$$;

-- 2. FUNCIÓN cleanup_expired_bookings
CREATE OR REPLACE FUNCTION public.cleanup_expired_bookings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Eliminar reservas que han expirado y no han sido pagadas
  DELETE FROM bookings 
  WHERE status = 'pending_payment' 
    AND expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- 3. FUNCIÓN cleanup_incomplete_matches
CREATE OR REPLACE FUNCTION public.cleanup_incomplete_matches()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  settings_rec record;
  cutoff_time timestamp with time zone;
  deleted_count integer := 0;
BEGIN
  -- Obtener configuraciones de limpieza
  SELECT * INTO settings_rec
  FROM match_management_settings
  WHERE cleanup_enabled = true
  LIMIT 1;
  
  -- Si la limpieza está deshabilitada, salir
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Calcular tiempo de corte
  cutoff_time := now() - (settings_rec.cleanup_hours_after_booking * INTERVAL '1 hour');
  
  -- Eliminar invitaciones de partidos que serán eliminados
  DELETE FROM match_invitations 
  WHERE match_id IN (
    SELECT m.id
    FROM matches m
    LEFT JOIN bookings b ON m.booking_id = b.id
    WHERE b.end_time < cutoff_time
      AND (
        -- Singles incompletos (sin player2)
        (m.is_doubles = false AND m.player2_id IS NULL)
        OR
        -- Dobles incompletos (sin partners)
        (m.is_doubles = true AND (m.player1_partner_id IS NULL OR m.player2_partner_id IS NULL))
      )
  );
  
  -- Eliminar partidos incompletos
  DELETE FROM matches 
  WHERE id IN (
    SELECT m.id
    FROM matches m
    LEFT JOIN bookings b ON m.booking_id = b.id
    WHERE b.end_time < cutoff_time
      AND (
        -- Singles incompletos (sin player2)
        (m.is_doubles = false AND m.player2_id IS NULL)
        OR
        -- Dobles incompletos (sin partners)
        (m.is_doubles = true AND (m.player1_partner_id IS NULL OR m.player2_partner_id IS NULL))
      )
  );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;