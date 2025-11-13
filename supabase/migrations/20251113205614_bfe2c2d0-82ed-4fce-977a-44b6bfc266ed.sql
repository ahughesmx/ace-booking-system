-- Actualizar todas las special_bookings existentes con los campos de pago
-- Usar created_at como payment_completed_at para registros históricos
UPDATE public.special_bookings
SET 
  payment_completed_at = COALESCE(payment_completed_at, created_at),
  payment_method = COALESCE(payment_method, 'efectivo'),
  processed_by = COALESCE(processed_by, created_by),
  status = COALESCE(status, 'paid')
WHERE payment_completed_at IS NULL 
   OR payment_method IS NULL 
   OR processed_by IS NULL;