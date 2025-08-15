-- CREAR RODRIGO DIRECTAMENTE - SOLUCIÓN DEFINITIVA
DO $$
DECLARE
    rodrigo_id uuid := gen_random_uuid();
BEGIN
    -- 1. Crear en auth.users
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
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        rodrigo_id,
        'authenticated',
        'authenticated',
        'rbaldomar@gmail.com',
        crypt('Abc12345', gen_salt('bf')),
        now(),
        now(),
        now(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Rodrigo Baldomar", "member_id": "422", "phone": "2299152465"}',
        false
    );
    
    -- 2. Crear perfil
    INSERT INTO profiles (id, full_name, member_id, phone)
    VALUES (rodrigo_id, 'Rodrigo Baldomar', '422', '2299152465');
    
    -- 3. Asignar rol
    INSERT INTO user_roles (user_id, role)
    VALUES (rodrigo_id, 'user');
    
    -- 4. Marcar solicitudes como procesadas
    UPDATE user_registration_requests 
    SET status = 'approved', processed_at = now()
    WHERE email = 'rbaldomar@gmail.com';
    
    RAISE NOTICE 'RODRIGO CREADO EXITOSAMENTE CON ID: %', rodrigo_id;
END $$;