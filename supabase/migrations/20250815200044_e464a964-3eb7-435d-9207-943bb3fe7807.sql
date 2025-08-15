-- Aprobar solicitud de Rodrigo Baldomar y crear usuario completo
DO $$
DECLARE
    rodrigo_auth_id uuid;
    request_id uuid := '3d178442-dfb5-4c53-bd08-1a242f2dcedf';
BEGIN
    -- Generar un UUID único para el usuario de Auth
    rodrigo_auth_id := gen_random_uuid();
    
    -- Crear usuario en auth.users (estructura exacta de Supabase Auth)
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
    
    -- Crear perfil completo
    INSERT INTO profiles (id, member_id, full_name, phone, created_at)
    VALUES (rodrigo_auth_id, '422', 'Rodrigo Baldomar', '2299152465', now());
    
    -- Asignar rol de usuario
    INSERT INTO user_roles (user_id, role, created_at)
    VALUES (rodrigo_auth_id, 'user', now());
    
    -- Marcar solicitud como aprobada
    UPDATE user_registration_requests 
    SET 
        status = 'approved',
        processed_at = now(),
        updated_at = now()
    WHERE id = request_id;
    
    RAISE NOTICE '✅ RODRIGO BALDOMAR APROBADO Y CREADO EXITOSAMENTE';
    RAISE NOTICE 'Auth ID: %', rodrigo_auth_id;
    RAISE NOTICE 'Member ID: 422 (mismo que familia Baldomar)';
    RAISE NOTICE 'Email: rbaldomar@gmail.com';
    RAISE NOTICE 'Teléfono: 2299152465';
    
END $$;