-- Permitir que email y phone sean opcionales en user_registration_requests
-- Esto permite migrar usuarios sin email o teléfono

ALTER TABLE public.user_registration_requests 
  ALTER COLUMN email DROP NOT NULL;

ALTER TABLE public.user_registration_requests 
  ALTER COLUMN phone DROP NOT NULL;

-- Agregar comentarios para documentar el cambio
COMMENT ON COLUMN public.user_registration_requests.email IS 'Email del usuario - opcional para permitir migraciones';
COMMENT ON COLUMN public.user_registration_requests.phone IS 'Teléfono del usuario - opcional para permitir migraciones';