-- Procesar manualmente el registro de Rodrigo Baldomar
-- 1. Primero verificar si ya existe un usuario con su email
-- 2. Si no existe, crear su perfil y rol directamente

-- Crear directamente el perfil de Rodrigo Baldomar usando los datos de su solicitud
INSERT INTO profiles (id, member_id, full_name, phone)
SELECT 
  gen_random_uuid() as id,
  '422' as member_id,
  'Rodrigo Baldomar' as full_name,
  '5540871087' as phone
WHERE NOT EXISTS (
  SELECT 1 FROM profiles WHERE member_id = '422'
);

-- Crear su rol de usuario
INSERT INTO user_roles (user_id, role)
SELECT 
  p.id,
  'user'::user_role
FROM profiles p 
WHERE p.member_id = '422' 
  AND NOT EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = p.id
  );

-- Marcar su solicitud como aprobada
UPDATE user_registration_requests
SET 
  status = 'approved',
  processed_at = NOW(),
  updated_at = NOW()
WHERE id = 'a6953ca6-31ae-43bf-9ebe-363f78a6dbca' 
  AND full_name = 'Rodrigo Baldomar';