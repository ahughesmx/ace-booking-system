-- Limpiar solicitudes duplicadas de Rodrigo Baldomar, dejando solo la más reciente
WITH duplicates AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at DESC) as rn
  FROM user_registration_requests 
  WHERE email = 'rbaldomar@gmail.com'
)
DELETE FROM user_registration_requests 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Limpiar otros duplicados por email en general
WITH all_duplicates AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at DESC) as rn
  FROM user_registration_requests 
)
DELETE FROM user_registration_requests 
WHERE id IN (
  SELECT id FROM all_duplicates WHERE rn > 1
);