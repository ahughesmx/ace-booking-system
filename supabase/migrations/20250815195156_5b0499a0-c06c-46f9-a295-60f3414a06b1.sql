-- ARREGLAR RODRIGO - buscar el registro huérfano y completarlo
DO $$
DECLARE
    rodrigo_auth_id uuid;
    rodrigo_profile_id uuid;
BEGIN
    -- Buscar ID en auth.users
    SELECT id INTO rodrigo_auth_id FROM auth.users WHERE email = 'rbaldomar@gmail.com';
    
    -- Buscar ID en profiles huérfano (que pueda tener datos de Rodrigo)
    SELECT id INTO rodrigo_profile_id FROM profiles 
    WHERE full_name ILIKE '%Rodrigo%' OR member_id = '422' 
    AND id NOT IN (SELECT id FROM auth.users WHERE email IN ('asbaldomar@gmail.com', 'nbaldomar@gmail.com', 'sbaldomar@gmail.com'));
    
    RAISE NOTICE 'Auth ID: %, Profile ID: %', rodrigo_auth_id, rodrigo_profile_id;
    
    -- Caso 1: Existe en auth pero no en profiles
    IF rodrigo_auth_id IS NOT NULL AND rodrigo_profile_id IS NULL THEN
        INSERT INTO profiles (id, full_name, member_id, phone)
        VALUES (rodrigo_auth_id, 'Rodrigo Baldomar', '422', '2299152465')
        ON CONFLICT (id) DO UPDATE SET
            full_name = 'Rodrigo Baldomar',
            member_id = '422',
            phone = '2299152465';
        
        INSERT INTO user_roles (user_id, role)
        VALUES (rodrigo_auth_id, 'user')
        ON CONFLICT (user_id, role) DO NOTHING;
        
        RAISE NOTICE 'Completado perfil para auth user existente: %', rodrigo_auth_id;
    
    -- Caso 2: Existe perfil huérfano pero no auth
    ELSIF rodrigo_auth_id IS NULL AND rodrigo_profile_id IS NOT NULL THEN
        -- Crear auth user con el mismo ID del perfil existente
        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password,
            email_confirmed_at, created_at, updated_at, raw_app_meta_data,
            raw_user_meta_data, is_super_admin
        ) VALUES (
            '00000000-0000-0000-0000-000000000000', rodrigo_profile_id, 'authenticated', 'authenticated',
            'rbaldomar@gmail.com', crypt('Abc12345', gen_salt('bf')), now(), now(), now(),
            '{"provider": "email", "providers": ["email"]}',
            '{"full_name": "Rodrigo Baldomar", "member_id": "422", "phone": "2299152465"}',
            false
        );
        
        -- Actualizar perfil
        UPDATE profiles SET 
            full_name = 'Rodrigo Baldomar',
            member_id = '422',
            phone = '2299152465'
        WHERE id = rodrigo_profile_id;
        
        INSERT INTO user_roles (user_id, role)
        VALUES (rodrigo_profile_id, 'user')
        ON CONFLICT (user_id, role) DO NOTHING;
        
        RAISE NOTICE 'Completado auth para perfil existente: %', rodrigo_profile_id;
        
    -- Caso 3: No existe nada, crear desde cero
    ELSIF rodrigo_auth_id IS NULL AND rodrigo_profile_id IS NULL THEN
        rodrigo_auth_id := gen_random_uuid();
        
        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password,
            email_confirmed_at, created_at, updated_at, raw_app_meta_data,
            raw_user_meta_data, is_super_admin
        ) VALUES (
            '00000000-0000-0000-0000-000000000000', rodrigo_auth_id, 'authenticated', 'authenticated',
            'rbaldomar@gmail.com', crypt('Abc12345', gen_salt('bf')), now(), now(), now(),
            '{"provider": "email", "providers": ["email"]}',
            '{"full_name": "Rodrigo Baldomar", "member_id": "422", "phone": "2299152465"}',
            false
        );
        
        INSERT INTO profiles (id, full_name, member_id, phone)
        VALUES (rodrigo_auth_id, 'Rodrigo Baldomar', '422', '2299152465');
        
        INSERT INTO user_roles (user_id, role)
        VALUES (rodrigo_auth_id, 'user');
        
        RAISE NOTICE 'Creado desde cero: %', rodrigo_auth_id;
        
    ELSE
        RAISE NOTICE 'Rodrigo ya existe completamente: auth=%, profile=%', rodrigo_auth_id, rodrigo_profile_id;
    END IF;
    
    -- Marcar solicitud como procesada
    UPDATE user_registration_requests 
    SET status = 'approved', processed_at = now()
    WHERE email = 'rbaldomar@gmail.com';
    
END $$;