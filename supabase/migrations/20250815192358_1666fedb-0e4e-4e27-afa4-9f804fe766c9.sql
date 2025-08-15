-- Crear Rodrigo Baldomar usando datos de su solicitud aprobada más reciente
-- Datos: rbaldomar@gmail.com, member_id: 422, phone: 2299152465

DO $$
DECLARE
    new_user_id uuid := gen_random_uuid();
BEGIN
    -- Crear usuario en auth.users con instance_id correcto
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        email_confirm_token,
        created_at,
        updated_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        role,
        aud
    ) VALUES (
        new_user_id,
        '00000000-0000-0000-0000-000000000000',
        'rbaldomar@gmail.com',
        crypt('Abc12345', gen_salt('bf')),
        now(),
        '',
        now(),
        now(),
        now(),
        '{"provider":"email","providers":["email"]}',
        '{"member_id":"422","full_name":"Rodrigo Baldomar","phone":"2299152465"}',
        false,
        'authenticated',
        'authenticated'
    );

    -- Crear perfil
    INSERT INTO profiles (id, full_name, member_id, phone)
    VALUES (new_user_id, 'Rodrigo Baldomar', '422', '2299152465');

    -- Asignar rol de usuario
    INSERT INTO user_roles (user_id, role)
    VALUES (new_user_id, 'user');

    -- Marcar solicitudes como procesadas correctamente
    UPDATE user_registration_requests 
    SET status = 'approved',
        processed_at = now(),
        processed_by = (SELECT id FROM auth.users WHERE email = 'test@gmail.com' LIMIT 1)
    WHERE email = 'rbaldomar@gmail.com' AND status = 'approved';

    RAISE NOTICE 'Usuario Rodrigo Baldomar creado exitosamente con ID: %', new_user_id;
END $$;