-- =====================================================
-- SCRIPT DE LIMPIEZA PRE-GO-LIVE
-- Eliminar todas las reservas transaccionales antes del 2025-10-15
-- =====================================================
-- IMPORTANTE: Este script está diseñado para ejecutarse UNA VEZ antes del Go Live
-- Puede reutilizarse modificando la fecha de corte si es necesario
-- =====================================================

-- Paso 1: VERIFICACIÓN DE SEGURIDAD
-- Verificar que no existen matches vinculados a bookings antiguos
DO $$
DECLARE
  match_count INTEGER;
  match_details TEXT;
BEGIN
  -- Contar matches vinculados a bookings antes del 2025-10-15
  SELECT COUNT(*) INTO match_count
  FROM matches m 
  JOIN bookings b ON m.booking_id = b.id
  WHERE b.start_time < '2025-10-15 00:00:00-07:00';
  
  IF match_count > 0 THEN
    -- Si hay matches, obtener detalles y abortar
    SELECT string_agg(m.id::text || ' -> booking ' || b.id::text, ', ')
    INTO match_details
    FROM matches m 
    JOIN bookings b ON m.booking_id = b.id
    WHERE b.start_time < '2025-10-15 00:00:00-07:00'
    LIMIT 5;
    
    RAISE EXCEPTION 'ABORTANDO: Existen % matches vinculados a bookings antiguos. Ejemplos: %. Elimina los matches manualmente primero.', 
      match_count, match_details;
  END IF;
  
  RAISE NOTICE '✓ Verificación de seguridad pasada: 0 matches vinculados a bookings antiguos';
END $$;

-- Paso 2: ELIMINAR SPECIAL BOOKINGS ANTIGUOS
-- Eliminar reservas especiales antes del 2025-10-15
DELETE FROM special_bookings 
WHERE start_time < '2025-10-15 00:00:00-07:00';

-- Reportar resultado
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Eliminados % special_bookings antes del 2025-10-15', deleted_count;
END $$;

-- Paso 3: ELIMINAR BOOKINGS ANTIGUOS
-- Esto también eliminará en cascada:
-- - receipt_numbers (ON DELETE CASCADE)
-- - affected_bookings (ON DELETE CASCADE)
DELETE FROM bookings 
WHERE start_time < '2025-10-15 00:00:00-07:00';

-- Reportar resultado
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Eliminados % bookings antes del 2025-10-15 (+ receipt_numbers y affected_bookings en cascada)', deleted_count;
END $$;

-- Paso 4: VERIFICACIÓN POST-LIMPIEZA
-- Verificar que no quedan datos antiguos
DO $$
DECLARE
  remaining_bookings INTEGER;
  remaining_special INTEGER;
  remaining_receipts INTEGER;
  remaining_affected INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_bookings
  FROM bookings 
  WHERE start_time < '2025-10-15 00:00:00-07:00';
  
  SELECT COUNT(*) INTO remaining_special
  FROM special_bookings 
  WHERE start_time < '2025-10-15 00:00:00-07:00';
  
  SELECT COUNT(*) INTO remaining_receipts
  FROM receipt_numbers 
  WHERE created_at < '2025-10-15 00:00:00-07:00';
  
  SELECT COUNT(*) INTO remaining_affected
  FROM affected_bookings 
  WHERE created_at < '2025-10-15 00:00:00-07:00';
  
  IF remaining_bookings > 0 OR remaining_special > 0 OR remaining_receipts > 0 OR remaining_affected > 0 THEN
    RAISE WARNING 'ATENCIÓN: Quedan datos antiguos: bookings=%, special=%, receipts=%, affected=%', 
      remaining_bookings, remaining_special, remaining_receipts, remaining_affected;
  ELSE
    RAISE NOTICE '✓ Verificación exitosa: 0 registros antiguos remanentes';
  END IF;
END $$;

-- Paso 5: REPORTE FINAL
-- Mostrar estado actual de las tablas transaccionales
SELECT 
  'bookings' as tabla,
  COUNT(*) as total_registros,
  MIN(start_time) as fecha_mas_antigua,
  MAX(start_time) as fecha_mas_reciente
FROM bookings
UNION ALL
SELECT 
  'special_bookings' as tabla,
  COUNT(*) as total_registros,
  MIN(start_time) as fecha_mas_antigua,
  MAX(start_time) as fecha_mas_reciente
FROM special_bookings
UNION ALL
SELECT 
  'receipt_numbers' as tabla,
  COUNT(*) as total_registros,
  MIN(created_at) as fecha_mas_antigua,
  MAX(created_at) as fecha_mas_reciente
FROM receipt_numbers;

-- =====================================================
-- NOTAS PARA REUTILIZACIÓN FUTURA:
-- =====================================================
-- Para limpiar datos de otra fecha, reemplazar '2025-10-15 00:00:00-07:00' 
-- con la nueva fecha de corte deseada en los pasos 2 y 3.
-- =====================================================