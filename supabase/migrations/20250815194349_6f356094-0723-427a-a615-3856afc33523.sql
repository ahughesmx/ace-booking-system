-- Solución de fondo: Crear una función que maneje correctamente las familias
-- y determine cuándo permitir member_ids duplicados

CREATE OR REPLACE FUNCTION public.can_use_member_id(
  p_member_id text,
  p_email text,
  p_full_name text
) RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  existing_count integer;
  similar_names_count integer;
BEGIN
  -- Verificar si el member_id existe en valid_member_ids
  IF NOT EXISTS (SELECT 1 FROM valid_member_ids WHERE member_id = p_member_id) THEN
    RETURN false;
  END IF;
  
  -- Contar usuarios existentes con este member_id
  SELECT COUNT(*) INTO existing_count
  FROM profiles 
  WHERE member_id = p_member_id;
  
  -- Si no hay usuarios con este member_id, permitir
  IF existing_count = 0 THEN
    RETURN true;
  END IF;
  
  -- Si ya hay usuarios, verificar si son de la misma familia
  -- (mismo apellido o nombres similares)
  SELECT COUNT(*) INTO similar_names_count
  FROM profiles 
  WHERE member_id = p_member_id
    AND (
      -- Mismo apellido (últimas palabras del nombre)
      SPLIT_PART(TRIM(full_name), ' ', ARRAY_LENGTH(STRING_TO_ARRAY(TRIM(full_name), ' '), 1)) = 
      SPLIT_PART(TRIM(p_full_name), ' ', ARRAY_LENGTH(STRING_TO_ARRAY(TRIM(p_full_name), ' '), 1))
      OR
      -- O apellidos similares (para casos como "García" vs "Garcia")
      SIMILARITY(
        SPLIT_PART(TRIM(full_name), ' ', ARRAY_LENGTH(STRING_TO_ARRAY(TRIM(full_name), ' '), 1)),
        SPLIT_PART(TRIM(p_full_name), ' ', ARRAY_LENGTH(STRING_TO_ARRAY(TRIM(p_full_name), ' '), 1))
      ) > 0.7
    );
  
  -- Si hay nombres similares (misma familia), permitir
  -- Si no hay similitud, bloquear (diferentes familias no pueden usar el mismo member_id)
  RETURN similar_names_count > 0;
END;
$$;