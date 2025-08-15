-- Asignar rol "user" a Ana Sofía Baldomar que fue registrada manualmente
INSERT INTO public.user_roles (user_id, role)
VALUES ('0985b539-652f-4477-92b4-4a3a87095c02', 'user')
ON CONFLICT (user_id) DO NOTHING;