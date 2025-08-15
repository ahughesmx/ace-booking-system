-- Arreglar el perfil de Rodrigo que ya existe
DO $$
DECLARE
    rodrigo_user_id uuid;
BEGIN
    -- Obtener el ID de Rodrigo
    SELECT id INTO rodrigo_user_id FROM auth.users WHERE email = 'rbaldomar@gmail.com';
    
    IF rodrigo_user_id IS NOT NULL THEN
        -- Actualizar o insertar el perfil
        INSERT INTO profiles (id, full_name, member_id, phone)
        VALUES (rodrigo_user_id, 'Rodrigo Baldomar', '422', '2299152465')
        ON CONFLICT (id) 
        DO UPDATE SET 
            full_name = 'Rodrigo Baldomar',
            member_id = '422',
            phone = '2299152465';
        
        -- Asegurar que tiene rol
        INSERT INTO user_roles (user_id, role)
        VALUES (rodrigo_user_id, 'user')
        ON CONFLICT (user_id, role) DO NOTHING;
        
        RAISE NOTICE 'Perfil de Rodrigo actualizado correctamente con ID: %', rodrigo_user_id;
    ELSE
        RAISE NOTICE 'Usuario Rodrigo no encontrado en auth.users';
    END IF;
END $$;