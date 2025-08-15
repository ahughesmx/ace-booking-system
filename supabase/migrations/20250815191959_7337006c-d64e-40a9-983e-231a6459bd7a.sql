-- Crear Rodrigo Baldomar manualmente usando un ID único diferente
DO $$
DECLARE
    new_user_id uuid := gen_random_uuid();
BEGIN
    -- Crear usuario en auth.users
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        last_sign_in_at,
        aud,
        role
    ) VALUES (
        new_user_id,
        '00000000-0000-0000-0000-000000000000',
        'rodrigo.baldomar@email.com',
        crypt('Abc12345', gen_salt('bf')),
        now(),
        now(),
        now(),
        now(),
        'authenticated',
        'authenticated'
    );

    -- Crear perfil
    INSERT INTO profiles (id, full_name, member_id, phone)
    VALUES (new_user_id, 'Rodrigo Baldomar', '422-ROD', '2299152467');

    -- Asignar rol de usuario
    INSERT INTO user_roles (user_id, role)
    VALUES (new_user_id, 'user');

    RAISE NOTICE 'Usuario Rodrigo Baldomar creado con ID: %', new_user_id;
END $$;