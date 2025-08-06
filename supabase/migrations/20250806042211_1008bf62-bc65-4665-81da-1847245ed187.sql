-- Crear job de cron para limpiar reservas expiradas cada 5 minutos
SELECT cron.schedule(
  'cleanup-expired-bookings-frequent',
  '*/5 * * * *', -- Cada 5 minutos
  $$
  DELETE FROM public.bookings 
  WHERE status = 'pending_payment' 
    AND expires_at < now();
  $$
);

-- Verificar que no hay más reservas expiradas
SELECT COUNT(*) as expired_bookings_count
FROM bookings 
WHERE status = 'pending_payment' 
  AND expires_at < now();