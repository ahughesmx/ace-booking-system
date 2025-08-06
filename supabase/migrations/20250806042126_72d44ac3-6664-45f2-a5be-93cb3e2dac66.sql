-- Eliminar reservas pendientes de pago que ya expiraron
DELETE FROM bookings 
WHERE status = 'pending_payment' 
  AND expires_at < now();

-- Ejecutar manualmente la función de limpieza
SELECT cleanup_expired_bookings();