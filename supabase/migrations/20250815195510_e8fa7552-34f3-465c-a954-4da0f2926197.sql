-- CREAR RODRIGO CON ID ESPECÍFICO ÚNICO
DO $$
DECLARE
    rodrigo_id uuid := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
BEGIN
    -- Verificar que este ID no existe
    IF EXISTS (SELECT 1 FROM profiles WHERE id = rodrigo_id) OR 
       EXISTS (SELECT 1 FROM auth.users WHERE id = rodrigo_id) THEN
        RAISE EXCEPTION 'ID ya existe, usar otro ID';
    END IF;
    
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
    
    -- Asignar rol
    INSERT INTO user_roles (user_id, role)
    VALUES (rodrigo_id, 'user');
    
    -- Actualizar solicitud
    UPDATE user_registration_requests 
    SET status = 'approved', processed_at = now()
    WHERE email = 'rbaldomar@gmail.com';
    
    RAISE NOTICE '✅ RODRIGO BALDOMAR CREADO CON ID: %', rodrigo_id;
END $$;