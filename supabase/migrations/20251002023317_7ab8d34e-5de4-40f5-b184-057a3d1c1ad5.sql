-- Agregar columna is_membership_holder a user_registration_requests
ALTER TABLE user_registration_requests 
ADD COLUMN IF NOT EXISTS is_membership_holder boolean DEFAULT false;

-- Crear índice para mejorar el rendimiento de consultas
CREATE INDEX IF NOT EXISTS idx_user_registration_requests_is_membership_holder 
ON user_registration_requests(is_membership_holder) 
WHERE is_membership_holder = true;

-- Comentario para documentar la columna
COMMENT ON COLUMN user_registration_requests.is_membership_holder IS 
'Indica si el usuario solicitante es titular de la membresía. Los titulares tienen privilegios especiales en el sistema.';