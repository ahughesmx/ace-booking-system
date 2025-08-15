-- Marcar solicitud de Rodrigo como aprobada (ya existe el usuario)
UPDATE user_registration_requests 
SET 
    status = 'approved',
    processed_at = now(),
    updated_at = now()
WHERE id = '3d178442-dfb5-4c53-bd08-1a242f2dcedf' 
  AND email = 'rbaldomar@gmail.com';