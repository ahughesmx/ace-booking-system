-- Crear usuario para Rodrigo Baldomar manualmente usando la edge function logic

-- Primero, vamos a simular lo que hace la edge function pero desde SQL
-- Esto es temporal para resolver el problema inmediato

-- Marcar que procesamos manualmente la solicitud
UPDATE user_registration_requests
SET 
  status = 'manual_processing',
  updated_at = NOW()
WHERE id = 'a6953ca6-31ae-43bf-9ebe-363f78a6dbca' 
  AND full_name = 'Rodrigo Baldomar';