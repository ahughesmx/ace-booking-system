-- Corregir la función para usar search_path inmutable
CREATE OR REPLACE FUNCTION public.cleanup_incomplete_matches()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

-- Ejecutar la limpieza manualmente ahora para eliminar partidos antiguos
SELECT cleanup_incomplete_matches();