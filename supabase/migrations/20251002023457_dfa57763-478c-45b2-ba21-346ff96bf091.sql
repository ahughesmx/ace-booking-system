-- Corregir registros de titulares que fueron importados incorrectamente
-- Estos usuarios fueron marcados como titulares en el archivo de migración original

-- OSCAR ARTEAGA CASTELLO (member_id: 8)
UPDATE user_registration_requests 
SET is_membership_holder = true
WHERE full_name = 'OSCAR ARTEAGA CASTELLO' 
  AND member_id = '8'
  AND is_migration = true;

-- ENRIQUE ALVAREZ ALONSO (member_id: 18)
UPDATE user_registration_requests 
SET is_membership_holder = true
WHERE full_name = 'ENRIQUE ALVAREZ ALONSO' 
  AND member_id = '18'
  AND is_migration = true;

-- Verificar que solo hay un titular por member_id
-- Si hay múltiples titulares para el mismo member_id, esto podría causar problemas
DO $$
DECLARE
  duplicate_holders INTEGER;
BEGIN
  -- Contar cuántos member_ids tienen más de un titular
  SELECT COUNT(DISTINCT member_id) INTO duplicate_holders
  FROM (
    SELECT member_id, COUNT(*) as holder_count
    FROM user_registration_requests
    WHERE is_membership_holder = true
    GROUP BY member_id
    HAVING COUNT(*) > 1
  ) as duplicates;
  
  IF duplicate_holders > 0 THEN
    RAISE WARNING 'Atención: % member_ids tienen múltiples titulares', duplicate_holders;
  END IF;
END $$;