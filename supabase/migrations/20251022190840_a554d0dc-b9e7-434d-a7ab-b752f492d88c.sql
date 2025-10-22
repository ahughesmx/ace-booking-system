-- Actualizar claves de Stripe con las credenciales del cliente
UPDATE payment_gateways
SET configuration = jsonb_set(
  jsonb_set(
    jsonb_set(
      configuration,
      '{publishableKeyTest}',
      '"pk_test_51RsF4LJYO9TGGmGZnQKWVG48fPOlHrdaK6FJ1m5VAoNztk60O4q9bzMTuSEm6ZLksr4fAbRxF5ktqRRvYIQZ2aij00c5xghzBR"'
    ),
    '{webhookSecretTest}',
    '"whsec_qo1kDdre3i3jkNsX3psoC46m3nHL54f0"'
  ),
  '{publishableKeyLive}',
  '"pk_live_51SGlaMBHmE2ACNjaKjViambCN9o79cNAwrh4dFymEEX7xuHjFAIdDBJmMxvC3mIKKuafvNo90k54jurvTYTUu92Z00hMDSMlKu"'
)
WHERE name = 'stripe';