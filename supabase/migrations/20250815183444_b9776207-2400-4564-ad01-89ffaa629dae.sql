-- Crear el perfil faltante para Ana Sofía Baldomar
INSERT INTO public.profiles (id, full_name, member_id, phone, created_at)
VALUES (
  '0985b539-652f-4477-92b4-4a3a87095c02',
  'Ana Sofía Baldomar',
  '422',
  NULL,  -- No tenemos el teléfono del registro
  now()
)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  member_id = EXCLUDED.member_id,
  created_at = COALESCE(profiles.created_at, EXCLUDED.created_at);