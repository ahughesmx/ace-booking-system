-- Migración segura de Stripe: Actualizar webhook y eliminar secret keys de BD
-- Paso 1: Actualizar URL del webhook de test a la correcta
UPDATE payment_gateways
SET configuration = jsonb_set(
  configuration,
  '{webhookEndpointTest}',
  '"https://bpjinatcgdmxqetfxjji.supabase.co/functions/v1/verify-payment"'
)
WHERE name = 'stripe';

-- Paso 2: Eliminar secret keys de la configuración (deben estar en Supabase Secrets)
UPDATE payment_gateways
SET configuration = configuration - 'secretKeyTest' - 'secretKeyLive'
WHERE name = 'stripe';