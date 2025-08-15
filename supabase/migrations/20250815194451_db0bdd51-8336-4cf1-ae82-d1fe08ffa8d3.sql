-- Arreglar la función simplificando la lógica de familia
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
  same_family_count integer;
  p_last_name text;
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
  
  -- Extraer apellido del nuevo usuario (última palabra del nombre)
  p_last_name := TRIM(SPLIT_PART(TRIM(p_full_name), ' ', ARRAY_LENGTH(STRING_TO_ARRAY(TRIM(p_full_name), ' '), 1)));
  
  -- Verificar si hay usuarios con el mismo apellido
  SELECT COUNT(*) INTO same_family_count
  FROM profiles 
  WHERE member_id = p_member_id
    AND TRIM(SPLIT_PART(TRIM(full_name), ' ', ARRAY_LENGTH(STRING_TO_ARRAY(TRIM(full_name), ' '), 1))) = p_last_name;
  
  -- Si hay al menos uno con el mismo apellido, es familia - permitir
  RETURN same_family_count > 0;
END;
$$;