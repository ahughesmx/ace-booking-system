-- Limpiar reservas pendientes antiguas sin expires_at
DELETE FROM public.bookings 
WHERE status = 'pending_payment' 
AND expires_at IS NULL 
AND created_at < NOW() - INTERVAL '2 hours';

-- Actualizar reservas pendientes sin expires_at para que tengan un tiempo de expiración
UPDATE public.bookings 
SET expires_at = created_at + INTERVAL '10 minutes'
WHERE status = 'pending_payment' 
AND expires_at IS NULL;