-- Crear a Rodrigo Baldomar con UUID único
DO $$
DECLARE
    rodrigo_uuid uuid := gen_random_uuid();
BEGIN
    -- Crear en auth.users
    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at, raw_app_meta_data,
        raw_user_meta_data, is_super_admin
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        rodrigo_uuid,
        'authenticated', 'authenticated', 'rbaldomar@gmail.com',
        crypt('Abc12345', gen_salt('bf')), now(), now(), now(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Rodrigo Baldomar", "member_id": "422", "phone": "2299152465"}',
        false
    );
    
    -- Crear perfil
    INSERT INTO profiles (id, member_id, full_name, phone, created_at)
    VALUES (rodrigo_uuid, '422', 'Rodrigo Baldomar', '2299152465', now());
    
    -- Asignar rol
    INSERT INTO user_roles (user_id, role, created_at)
    VALUES (rodrigo_uuid, 'user', now());
    
    -- Actualizar solicitud de registro como aprobada
    UPDATE user_registration_requests 
    SET status = 'approved', processed_at = now(), updated_at = now()
    WHERE email = 'rbaldomar@gmail.com' AND status = 'pending';
    
    RAISE NOTICE '✅ RODRIGO BALDOMAR CREADO EXITOSAMENTE';
    RAISE NOTICE 'UUID: %', rodrigo_uuid;
    RAISE NOTICE 'Email: rbaldomar@gmail.com';
    RAISE NOTICE 'Member ID: 422 (familia Baldomar)';
    RAISE NOTICE 'Contraseña: Abc12345';
    
END $$;