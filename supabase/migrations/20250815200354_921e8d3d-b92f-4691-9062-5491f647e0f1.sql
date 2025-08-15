-- Limpiar registros duplicados de Rodrigo y crear uno correcto
DO $$
BEGIN
    -- Eliminar cualquier registro previo de Rodrigo en profiles
    DELETE FROM user_roles WHERE user_id IN (
        SELECT id FROM profiles WHERE full_name = 'Rodrigo Baldomar'
    );
    
    DELETE FROM profiles WHERE full_name = 'Rodrigo Baldomar';
    
    -- Eliminar de auth.users si existe
    DELETE FROM auth.users WHERE email = 'rbaldomar@gmail.com';
    
    -- Ahora crear correctamente a Rodrigo
    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at, raw_app_meta_data,
        raw_user_meta_data, is_super_admin
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        'authenticated', 'authenticated', 'rbaldomar@gmail.com',
        crypt('Abc12345', gen_salt('bf')), now(), now(), now(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Rodrigo Baldomar", "member_id": "422", "phone": "2299152465"}',
        false
    );
    
    -- Crear perfil con el mismo ID
    INSERT INTO profiles (id, member_id, full_name, phone, created_at)
    VALUES ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '422', 'Rodrigo Baldomar', '2299152465', now());
    
    -- Asignar rol
    INSERT INTO user_roles (user_id, role, created_at)
    VALUES ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'user', now());
    
    RAISE NOTICE 'RODRIGO BALDOMAR CREADO: a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    
END $$;