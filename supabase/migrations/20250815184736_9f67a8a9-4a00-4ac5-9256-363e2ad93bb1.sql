-- Completar el registro de Natalia Baldomar manualmente
-- 1. Crear/actualizar su perfil con los datos de la solicitud
INSERT INTO public.profiles (id, full_name, member_id, phone, created_at)
VALUES (
  '6b662d79-e54f-40ac-ab12-ed29e890e179',
  'Natalia Baldomar',
  '422',
  NULL,
  now()
)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  member_id = EXCLUDED.member_id,
  phone = COALESCE(profiles.phone, EXCLUDED.phone);

-- 2. Asignar rol de usuario
INSERT INTO public.user_roles (user_id, role)
VALUES ('6b662d79-e54f-40ac-ab12-ed29e890e179', 'user')
ON CONFLICT (user_id) DO NOTHING;

-- 3. Marcar la solicitud como aprobada
UPDATE public.user_registration_requests 
SET 
  status = 'approved',
  processed_at = now(),
  processed_by = 'de03fd7a-0554-4dc8-bbd2-b98e848d0b0e'
WHERE id = '79444fac-d24c-4708-b7b3-783220632af3' AND status = 'pending';