-- Crear correctamente a Rodrigo Baldomar en auth.users y profiles
DO $$
DECLARE
    rodrigo_auth_id uuid := gen_random_uuid();
BEGIN
    -- Crear en auth.users con estructura completa
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
        confirmation_sent_at,
        recovery_sent_at,
        email_change_token_current,
        email_change_confirm_status,
        banned_until,
        reauthentication_token,
        reauthentication_sent_at,
        is_sso_user,
        deleted_at,
        is_anonymous
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        rodrigo_auth_id,
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
        now(),
        null,
        '',
        0,
        null,
        '',
        null,
        false,
        null,
        false
    );
    
    -- Crear perfil
    INSERT INTO profiles (id, member_id, full_name, phone, created_at)
    VALUES (rodrigo_auth_id, '422', 'Rodrigo Baldomar', '2299152465', now());
    
    -- Asignar rol
    INSERT INTO user_roles (user_id, role, created_at)
    VALUES (rodrigo_auth_id, 'user', now());
    
    RAISE NOTICE '✅ RODRIGO BALDOMAR CREADO CORRECTAMENTE';
    RAISE NOTICE 'ID: %', rodrigo_auth_id;
    RAISE NOTICE 'Email: rbaldomar@gmail.com';
    RAISE NOTICE 'Member ID: 422';
    RAISE NOTICE 'Password: Abc12345';
    
END $$;