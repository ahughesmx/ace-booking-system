-- Generar UUID único y crear a Rodrigo Baldomar
DO $$
DECLARE
    nuevo_uuid uuid;
BEGIN
    -- Generar UUID único verificado
    LOOP
        nuevo_uuid := gen_random_uuid();
        -- Verificar que no existe en profiles ni auth.users
        EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE id = nuevo_uuid) 
              AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = nuevo_uuid);
    END LOOP;
    
    -- Crear en auth.users
    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at, raw_app_meta_data,
        raw_user_meta_data, is_super_admin
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        nuevo_uuid,
        'authenticated', 'authenticated', 'rbaldomar@gmail.com',
        crypt('Abc12345', gen_salt('bf')), now(), now(), now(),
        '{"provider": "email", "providers": ["email"]}',
        '{"member_id": "422", "full_name": "Rodrigo Baldomar", "phone": "2299152465"}',
        false
    );
    
    -- Crear perfil
    INSERT INTO profiles (id, member_id, full_name, phone)
    VALUES (nuevo_uuid, '422', 'Rodrigo Baldomar', '2299152465');
    
    -- Asignar rol
    INSERT INTO user_roles (user_id, role)
    VALUES (nuevo_uuid, 'user');
    
    RAISE NOTICE '✅ RODRIGO BALDOMAR CREADO EXITOSAMENTE CON UUID: %', nuevo_uuid;
    
END $$;