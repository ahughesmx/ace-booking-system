-- Actualizar timeout de pagos de 5 a 10 minutos
UPDATE public.payment_settings 
SET payment_timeout_minutes = 10
WHERE id IS NOT NULL;

-- Comentario: Aumentamos el timeout de 5 a 10 minutos para reducir
-- el riesgo de pagos huérfanos causados por verificaciones lentas