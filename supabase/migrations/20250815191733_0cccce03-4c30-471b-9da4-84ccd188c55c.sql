-- Crear usuario Rodrigo Baldomar directamente
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  gen_random_uuid(),
  'rodrigo.baldomar@email.com',
  crypt('password123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '',
  '',
  '',
  ''
);

-- Obtener el ID del usuario recién creado para crear su perfil
WITH new_user AS (
  SELECT id FROM auth.users WHERE email = 'rodrigo.baldomar@email.com'
)
INSERT INTO profiles (id, full_name, member_id, phone)
SELECT id, 'Rodrigo Baldomar', '422-RB', '2299152466'
FROM new_user;

-- Asignar rol de usuario
WITH new_user AS (
  SELECT id FROM auth.users WHERE email = 'rodrigo.baldomar@email.com'
)
INSERT INTO user_roles (user_id, role)
SELECT id, 'user'::user_role
FROM new_user;