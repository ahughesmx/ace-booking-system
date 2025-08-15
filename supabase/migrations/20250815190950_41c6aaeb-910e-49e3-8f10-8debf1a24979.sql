-- Crear manualmente el perfil de Rodrigo Baldomar con un UUID específico
-- Primero verificar si la solicitud existe y obtener sus datos

-- Crear el perfil de Rodrigo Baldomar directamente
INSERT INTO profiles (id, member_id, full_name, phone)
VALUES (
  'b1234567-89ab-cdef-0123-456789abcdef',
  '422',
  'Rodrigo Baldomar',
  '5540871087'
)
ON CONFLICT (id) DO NOTHING;

-- Crear su rol de usuario
INSERT INTO user_roles (user_id, role)
VALUES (
  'b1234567-89ab-cdef-0123-456789abcdef',
  'user'::user_role
)
ON CONFLICT (user_id) DO NOTHING;