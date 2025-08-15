-- SOLUCIÓN FINAL: Limpiar y crear correctamente
DO $$
DECLARE
    rodrigo_id uuid;
    existing_auth_id uuid;
BEGIN
    -- Buscar si ya existe en auth.users
    SELECT id INTO existing_auth_id FROM auth.users WHERE email = 'rbaldomar@gmail.com';
    
    IF existing_auth_id IS NOT NULL THEN
        -- Si existe en auth.users, usar ese ID
        rodrigo_id := existing_auth_id;
        RAISE NOTICE 'Usuario encontrado en auth.users con ID: %', rodrigo_id;
        
        -- Crear o actualizar perfil
        INSERT INTO profiles (id, full_name, member_id, phone)
        VALUES (rodrigo_id, 'Rodrigo Baldomar', '422', '2299152465')
        ON CONFLICT (id) DO UPDATE SET
            full_name = 'Rodrigo Baldomar',
            member_id = '422',
            phone = '2299152465';
            
        -- Crear o actualizar rol
        INSERT INTO user_roles (user_id, role)
        VALUES (rodrigo_id, 'user')
        ON CONFLICT (user_id, role) DO NOTHING;
        
    ELSE
        -- No existe, crear todo desde cero
        rodrigo_id := gen_random_uuid();
        
        -- Crear en auth.users
        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password,
            email_confirmed_at, created_at, updated_at, raw_app_meta_data,
            raw_user_meta_data, is_super_admin
        ) VALUES (
            '00000000-0000-0000-0000-000000000000', rodrigo_id, 'authenticated', 'authenticated',
            'rbaldomar@gmail.com', crypt('Abc12345', gen_salt('bf')), now(), now(), now(),
            '{"provider": "email", "providers": ["email"]}',
            '{"full_name": "Rodrigo Baldomar", "member_id": "422", "phone": "2299152465"}',
            false
        );
        
        -- Crear perfil
        INSERT INTO profiles (id, full_name, member_id, phone)
        VALUES (rodrigo_id, 'Rodrigo Baldomar', '422', '2299152465');
        
        -- Crear rol
        INSERT INTO user_roles (user_id, role)
        VALUES (rodrigo_id, 'user');
    END IF;
    
    -- Marcar solicitudes como procesadas
    UPDATE user_registration_requests 
    SET status = 'approved', processed_at = now()
    WHERE email = 'rbaldomar@gmail.com';
    
    RAISE NOTICE '✅ RODRIGO BALDOMAR CREADO/ACTUALIZADO EXITOSAMENTE CON ID: %', rodrigo_id;
END $$;