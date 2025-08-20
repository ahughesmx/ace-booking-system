-- Actualizar las reservas existentes que tienen actual_amount_charged null
-- para que muestren el monto del campo amount
UPDATE bookings 
SET actual_amount_charged = amount 
WHERE actual_amount_charged IS NULL 
  AND amount IS NOT NULL 
  AND status = 'paid';

-- Para las reservas que no tienen ni actual_amount_charged ni amount,
-- vamos a usar un valor por defecto basado en configuraciones de precios
UPDATE bookings 
SET actual_amount_charged = 250.00 
WHERE actual_amount_charged IS NULL 
  AND amount IS NULL 
  AND status = 'paid';