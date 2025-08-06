-- Crear configuración inicial de match management si no existe
INSERT INTO match_management_settings (cleanup_hours_after_booking, cleanup_enabled, cleanup_frequency_minutes)
SELECT 5, true, 60
WHERE NOT EXISTS (SELECT 1 FROM match_management_settings);

-- Crear la función de limpieza de partidos incompletos si no existe
CREATE OR REPLACE FUNCTION public.cleanup_incomplete_matches()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  settings_rec record;
  cutoff_time timestamp with time zone;
  deleted_count integer := 0;
BEGIN
  -- Obtener configuraciones de limpieza
  SELECT * INTO settings_rec
  FROM public.match_management_settings
  WHERE cleanup_enabled = true
  LIMIT 1;
  
  -- Si la limpieza está deshabilitada, salir
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Calcular tiempo de corte
  cutoff_time := now() - (settings_rec.cleanup_hours_after_booking * INTERVAL '1 hour');
  
  -- Eliminar invitaciones de partidos que serán eliminados
  DELETE FROM public.match_invitations 
  WHERE match_id IN (
    SELECT m.id
    FROM public.matches m
    LEFT JOIN public.bookings b ON m.booking_id = b.id
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
  DELETE FROM public.matches 
  WHERE id IN (
    SELECT m.id
    FROM public.matches m
    LEFT JOIN public.bookings b ON m.booking_id = b.id
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

-- Crear job de cron para ejecutar la limpieza cada hora
SELECT cron.schedule(
  'cleanup-incomplete-matches',
  '0 * * * *', -- Cada hora en el minuto 0
  $$
  SELECT public.cleanup_incomplete_matches();
  $$
);