-- ELIMINAR COMPLETAMENTE TODO RASTRO DE RODRIGO BALDOMAR

DO $$
DECLARE
    rodrigo_user_id uuid;
BEGIN
    -- Buscar el ID de Rodrigo en todas las tablas posibles
    SELECT id INTO rodrigo_user_id FROM auth.users WHERE email = 'rbaldomar@gmail.com';
    
    -- Si existe en auth.users, eliminar todo
    IF rodrigo_user_id IS NOT NULL THEN
        RAISE NOTICE 'Eliminando usuario Rodrigo con ID: %', rodrigo_user_id;
        
        -- Eliminar de user_roles
        DELETE FROM user_roles WHERE user_id = rodrigo_user_id;
        RAISE NOTICE 'Eliminado de user_roles';
        
        -- Eliminar de profiles
        DELETE FROM profiles WHERE id = rodrigo_user_id;
        RAISE NOTICE 'Eliminado de profiles';
        
        -- Eliminar de auth.users
        DELETE FROM auth.users WHERE id = rodrigo_user_id;
        RAISE NOTICE 'Eliminado de auth.users';
    ELSE
        RAISE NOTICE 'No se encontró usuario en auth.users con email rbaldomar@gmail.com';
    END IF;
    
    -- Eliminar TODAS las solicitudes de registro de Rodrigo
    DELETE FROM user_registration_requests WHERE email = 'rbaldomar@gmail.com';
    RAISE NOTICE 'Eliminadas todas las solicitudes de registro';
    
    -- Buscar y eliminar cualquier perfil huérfano con nombre Rodrigo
    DELETE FROM profiles WHERE full_name ILIKE '%Rodrigo%' AND full_name ILIKE '%Baldomar%';
    RAISE NOTICE 'Eliminados perfiles huérfanos de Rodrigo';
    
    -- Buscar y eliminar cualquier rol huérfano relacionado con member_id 422
    DELETE FROM user_roles WHERE user_id IN (
        SELECT id FROM profiles WHERE member_id = '422' AND full_name ILIKE '%Rodrigo%'
    );
    RAISE NOTICE 'Eliminados roles huérfanos';
    
    RAISE NOTICE 'LIMPIEZA COMPLETA TERMINADA - Todo rastro de Rodrigo Baldomar ha sido eliminado';
END $$;