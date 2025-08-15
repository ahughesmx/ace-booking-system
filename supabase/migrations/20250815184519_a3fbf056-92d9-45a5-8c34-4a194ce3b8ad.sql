-- Aprobar automáticamente a Natalia Baldomar que se registró manualmente
UPDATE public.user_registration_requests 
SET 
  status = 'approved',
  processed_at = now(),
  processed_by = 'de03fd7a-0554-4dc8-bbd2-b98e848d0b0e'
WHERE id = '79444fac-d24c-4708-b7b3-783220632af3' AND status = 'pending';

-- Crear usuario en auth.users para Natalia (simulando el proceso que debería haber ocurrido)
-- Crear perfil completo para Natalia
INSERT INTO public.profiles (id, full_name, member_id, phone, created_at)
SELECT 
  gen_random_uuid(),
  'Natalia Baldomar',
  '422',
  null,
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE full_name = 'Natalia Baldomar' AND member_id = '422'
);

-- Asignar rol usuario
INSERT INTO public.user_roles (user_id, role)
SELECT 
  p.id,
  'user'
FROM public.profiles p
WHERE p.full_name = 'Natalia Baldomar' AND p.member_id = '422'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id
);