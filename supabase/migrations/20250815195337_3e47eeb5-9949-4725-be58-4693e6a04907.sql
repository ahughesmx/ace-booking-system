-- CREAR RODRIGO BALDOMAR DESDE CERO - DEFINITIVO
DO $$
DECLARE
    rodrigo_id uuid := gen_random_uuid();
BEGIN
    -- Crear en auth.users
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
    
    -- Crear perfil
    INSERT INTO profiles (id, full_name, member_id, phone)
    VALUES (rodrigo_id, 'Rodrigo Baldomar', '422', '2299152465');
    
    -- Asignar rol
    INSERT INTO user_roles (user_id, role)
    VALUES (rodrigo_id, 'user');
    
    RAISE NOTICE '✅ RODRIGO BALDOMAR CREADO EXITOSAMENTE: %', rodrigo_id;
END $$;