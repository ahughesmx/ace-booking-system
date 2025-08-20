-- Agregar campo para identificar titulares de membresía
ALTER TABLE public.profiles 
ADD COLUMN is_membership_holder boolean DEFAULT false;

-- Crear índice para mejorar rendimiento
CREATE INDEX idx_profiles_membership_holder 
ON public.profiles (member_id, is_membership_holder) 
WHERE is_membership_holder = true;

-- Función para asignar titular automáticamente
CREATE OR REPLACE FUNCTION public.auto_assign_membership_holder()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  existing_holder_count integer;
BEGIN
  -- Solo procesar si se está insertando un nuevo usuario con member_id
  IF TG_OP = 'INSERT' AND NEW.member_id IS NOT NULL THEN
    -- Verificar si ya existe un titular para este member_id
    SELECT COUNT(*) INTO existing_holder_count
    FROM profiles 
    WHERE member_id = NEW.member_id 
      AND is_membership_holder = true;
    
    -- Si no hay titular, hacer a este usuario el titular
    IF existing_holder_count = 0 THEN
      NEW.is_membership_holder = true;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Crear trigger para asignar titular automáticamente
CREATE TRIGGER trigger_auto_assign_membership_holder
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_membership_holder();

-- Migrar datos existentes: asignar titular al usuario más antiguo de cada member_id
WITH oldest_members AS (
  SELECT DISTINCT ON (member_id) 
    id, member_id
  FROM profiles 
  WHERE member_id IS NOT NULL
  ORDER BY member_id, created_at ASC
)
UPDATE profiles 
SET is_membership_holder = true
WHERE id IN (SELECT id FROM oldest_members);

-- Función para dar de baja usuarios de una membresía
CREATE OR REPLACE FUNCTION public.deactivate_family_member(
  p_member_id_to_deactivate uuid,
  p_requesting_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  requester_member_id text;
  target_member_id text;
  is_requester_holder boolean;
BEGIN
  -- Verificar que el usuario solicitante existe y obtener su member_id
  SELECT member_id, is_membership_holder 
  INTO requester_member_id, is_requester_holder
  FROM profiles 
  WHERE id = p_requesting_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario solicitante no encontrado';
  END IF;
  
  -- Verificar que el usuario solicitante es titular de membresía
  IF NOT is_requester_holder THEN
    RAISE EXCEPTION 'Solo el titular de la membresía puede dar de baja a otros miembros';
  END IF;
  
  -- Obtener el member_id del usuario a dar de baja
  SELECT member_id INTO target_member_id
  FROM profiles 
  WHERE id = p_member_id_to_deactivate;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario a dar de baja no encontrado';
  END IF;
  
  -- Verificar que ambos usuarios pertenecen a la misma membresía
  IF requester_member_id != target_member_id THEN
    RAISE EXCEPTION 'Solo puedes dar de baja a miembros de tu propia membresía';
  END IF;
  
  -- No permitir que el titular se dé de baja a sí mismo
  IF p_member_id_to_deactivate = p_requesting_user_id THEN
    RAISE EXCEPTION 'El titular no puede darse de baja a sí mismo';
  END IF;
  
  -- Eliminar el usuario del auth y de profiles (cascada)
  -- Primero eliminar de auth.users, lo que disparará la eliminación en cascada
  DELETE FROM auth.users WHERE id = p_member_id_to_deactivate;
  
  RETURN true;
END;
$$;