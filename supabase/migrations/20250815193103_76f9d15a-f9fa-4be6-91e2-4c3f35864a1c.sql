-- Crear directamente el usuario Rodrigo Baldomar en la base de datos
-- Paso 1: Insertar en auth.users
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    last_sign_in_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'rbaldomar@gmail.com',
    crypt('Abc12345', gen_salt('bf')),
    now(),
    now(),
    now(),
    '',
    '',
    '',
    '',
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Rodrigo Baldomar", "member_id": "422", "phone": "2299152465"}',
    false,
    now()
)
RETURNING id;

-- Obtener el ID del usuario recién creado para los siguientes pasos
DO $$
DECLARE
    new_user_id uuid;
BEGIN
    -- Obtener el ID del usuario recién creado
    SELECT id INTO new_user_id FROM auth.users WHERE email = 'rbaldomar@gmail.com';
    
    -- Paso 2: Crear perfil
    INSERT INTO profiles (id, full_name, member_id, phone)
    VALUES (new_user_id, 'Rodrigo Baldomar', '422', '2299152465');
    
    -- Paso 3: Asignar rol
    INSERT INTO user_roles (user_id, role)
    VALUES (new_user_id, 'user');
    
    RAISE NOTICE 'Usuario Rodrigo Baldomar creado con ID: %', new_user_id;
END $$;