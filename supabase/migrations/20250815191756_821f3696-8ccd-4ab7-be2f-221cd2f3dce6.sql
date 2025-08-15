-- Procesar la solicitud de registro pendiente de Rodrigo Baldomar
UPDATE user_registration_requests 
SET status = 'approved', 
    processed_at = now(),
    processed_by = (SELECT id FROM auth.users WHERE email = 'test@gmail.com')
WHERE id = 'f244a9eb-8ee9-4b64-9845-624936f965e5';