-- Actualizar la reserva expirada para marcarla como pagada en efectivo
-- Esta es la reserva que el operador intentó procesar pero quedó en pending_payment

UPDATE public.bookings 
SET 
  status = 'paid',
  payment_completed_at = now(),
  payment_method = 'efectivo',
  expires_at = NULL
WHERE id = '4784ff34-1757-4a76-b4aa-c25ecf0fbf3a'
  AND status = 'pending_payment';

-- Verificar que la actualización fue exitosa
SELECT id, status, payment_method, start_time, end_time 
FROM public.bookings 
WHERE id = '4784ff34-1757-4a76-b4aa-c25ecf0fbf3a';