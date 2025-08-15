-- Crear el usuario de Rodrigo Baldomar manualmente
-- Usaremos la función de Supabase para crear el usuario en auth y el perfil

-- Como no podemos crear directamente en auth.users desde SQL, 
-- vamos a resetear su solicitud a "pending" para que pueda ser procesada nuevamente
UPDATE user_registration_requests
SET 
  status = 'pending',
  processed_at = NULL,
  processed_by = NULL,
  updated_at = NOW()
WHERE id = 'a6953ca6-31ae-43bf-9ebe-363f78a6dbca' 
  AND full_name = 'Rodrigo Baldomar';