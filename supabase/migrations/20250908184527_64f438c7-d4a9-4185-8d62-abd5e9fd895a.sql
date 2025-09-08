-- Insertar el registro de MercadoPago si no existe
INSERT INTO payment_gateways (name, enabled, test_mode, configuration)
SELECT 'mercadopago', false, true, '{}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM payment_gateways WHERE name = 'mercadopago'
);

-- Insertar efectivo si no existe (para tener todas las pasarelas)
INSERT INTO payment_gateways (name, enabled, test_mode, configuration)
SELECT 'efectivo', true, false, '{}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM payment_gateways WHERE name = 'efectivo'
);