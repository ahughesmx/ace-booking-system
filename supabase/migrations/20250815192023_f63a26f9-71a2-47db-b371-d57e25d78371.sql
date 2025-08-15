-- Usar la edge function de manual-user-creation para crear Rodrigo correctamente
-- Primero verificar si ya existe
SELECT * FROM profiles WHERE full_name ILIKE '%rodrigo%baldomar%';