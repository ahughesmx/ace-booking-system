-- Limpieza de datos históricos: Eliminar reservas "fantasma"
-- Estas son reservas que fueron marcadas como 'cancelled' pero nunca se pagaron
-- (contaminación de datos histórica que ya no debe ocurrir con los nuevos cambios)

DELETE FROM bookings 
WHERE status = 'cancelled' 
AND payment_completed_at IS NULL;

-- Verificar resultado de la limpieza
-- Esta consulta ayudará a confirmar que la limpieza fue exitosa
SELECT 
  status,
  COUNT(*) as total,
  COUNT(CASE WHEN payment_completed_at IS NOT NULL THEN 1 END) as with_payment,
  COUNT(CASE WHEN payment_completed_at IS NULL THEN 1 END) as without_payment
FROM bookings
GROUP BY status
ORDER BY status;