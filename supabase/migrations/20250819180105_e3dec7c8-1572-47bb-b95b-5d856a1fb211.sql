-- Resetear la solicitud de Rodrigo a 'pending' para procesarla correctamente
UPDATE user_registration_requests 
SET 
    status = 'pending',
    processed_at = NULL,
    processed_by = NULL,
    updated_at = now()
WHERE id = '3d178442-dfb5-4c53-bd08-1a242f2dcedf' 
  AND email = 'rbaldomar@gmail.com';