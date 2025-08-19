-- Crear a Rodrigo Baldomar basado en su solicitud aprobada
DO $$
DECLARE
    rodrigo_id uuid;
BEGIN
    -- Generar UUID único
    rodrigo_id := gen_random_uuid();
    
    -- Crear en auth.users
    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at, raw_app_meta_data,
        raw_user_meta_data, is_super_admin
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        rodrigo_id,
        'authenticated', 'authenticated', 'rbaldomar@gmail.com',
        crypt('Abc12345', gen_salt('bf')), now(), now(), now(),
        '{"provider": "email", "providers": ["email"]}',
        '{"member_id": "422", "full_name": "Rodrigo Baldomar", "phone": "2299152465"}',
        false
    );
    
    -- Crear perfil
    INSERT INTO profiles (id, member_id, full_name, phone)
    VALUES (rodrigo_id, '422', 'Rodrigo Baldomar', '2299152465');
    
    -- Asignar rol
    INSERT INTO user_roles (user_id, role)
    VALUES (rodrigo_id, 'user');
    
    RAISE NOTICE '✅ RODRIGO BALDOMAR CREADO CORRECTAMENTE';
    RAISE NOTICE 'ID: %', rodrigo_id;
    RAISE NOTICE 'Email: rbaldomar@gmail.com';
    RAISE NOTICE 'Member ID: 422 (familia Baldomar)';
    
END $$;