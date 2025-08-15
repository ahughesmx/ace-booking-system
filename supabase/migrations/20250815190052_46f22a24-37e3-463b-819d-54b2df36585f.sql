-- Crear perfil para Rodrigo Baldomar manualmente
-- Primero, verificar si ya existe en auth.users y crear el perfil correspondiente

-- Crear un UUID específico para Rodrigo basado en su email
-- En caso de que el usuario ya exista en auth, esto debería coincidir
INSERT INTO profiles (id, full_name, member_id, phone, created_at)
VALUES (
  gen_random_uuid(), -- Generamos un UUID nuevo ya que no tenemos el de auth
  'Rodrigo Baldomar',
  '422',
  '2299152465',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Obtener el ID del perfil recién creado para asignar rol
-- Nota: Como no podemos hacer SELECT en una migration, usaremos una función
DO $$
DECLARE
  rodrigo_profile_id UUID;
BEGIN
  -- Buscar el perfil de Rodrigo
  SELECT id INTO rodrigo_profile_id 
  FROM profiles 
  WHERE full_name = 'Rodrigo Baldomar' AND member_id = '422';
  
  -- Si encontramos el perfil, asignar rol de usuario
  IF rodrigo_profile_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role, created_at)
    VALUES (rodrigo_profile_id, 'user', NOW())
    ON CONFLICT (user_id) DO UPDATE SET role = 'user';
  END IF;
END $$;