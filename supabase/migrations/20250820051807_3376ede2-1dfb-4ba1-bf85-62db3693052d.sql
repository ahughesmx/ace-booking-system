-- Agregar columna para soft delete en la tabla profiles
ALTER TABLE public.profiles 
ADD COLUMN is_active boolean NOT NULL DEFAULT true,
ADD COLUMN deactivated_at timestamp with time zone,
ADD COLUMN deactivated_by uuid REFERENCES auth.users(id);

-- Crear índice para mejorar performance al filtrar usuarios activos
CREATE INDEX idx_profiles_is_active ON public.profiles(is_active);

-- Reemplazar la función deactivate_family_member para usar soft delete
CREATE OR REPLACE FUNCTION public.deactivate_family_member(p_member_id_to_deactivate uuid, p_requesting_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  requester_member_id text;
  target_member_id text;
  is_requester_holder boolean;
BEGIN
  -- Verificar que el usuario solicitante existe y obtener su member_id
  SELECT member_id, is_membership_holder 
  INTO requester_member_id, is_requester_holder
  FROM profiles 
  WHERE id = p_requesting_user_id AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario solicitante no encontrado o inactivo';
  END IF;
  
  -- Verificar que el usuario solicitante es titular de membresía
  IF NOT is_requester_holder THEN
    RAISE EXCEPTION 'Solo el titular de la membresía puede dar de baja a otros miembros';
  END IF;
  
  -- Obtener el member_id del usuario a dar de baja
  SELECT member_id INTO target_member_id
  FROM profiles 
  WHERE id = p_member_id_to_deactivate AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario a dar de baja no encontrado o ya está inactivo';
  END IF;
  
  -- Verificar que ambos usuarios pertenecen a la misma membresía
  IF requester_member_id != target_member_id THEN
    RAISE EXCEPTION 'Solo puedes dar de baja a miembros de tu propia membresía';
  END IF;
  
  -- No permitir que el titular se dé de baja a sí mismo
  IF p_member_id_to_deactivate = p_requesting_user_id THEN
    RAISE EXCEPTION 'El titular no puede darse de baja a sí mismo';
  END IF;
  
  -- Realizar soft delete: marcar como inactivo
  UPDATE profiles 
  SET 
    is_active = false,
    deactivated_at = now(),
    deactivated_by = p_requesting_user_id,
    updated_at = now()
  WHERE id = p_member_id_to_deactivate;
  
  RETURN true;
END;
$function$;

-- Crear función para reactivar usuarios (solo admins)
CREATE OR REPLACE FUNCTION public.reactivate_family_member(p_member_id_to_reactivate uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Solo admins pueden reactivar usuarios
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Solo los administradores pueden reactivar usuarios';
  END IF;
  
  -- Reactivar usuario
  UPDATE profiles 
  SET 
    is_active = true,
    deactivated_at = NULL,
    deactivated_by = NULL,
    updated_at = now()
  WHERE id = p_member_id_to_reactivate;
  
  RETURN true;
END;
$function$;

-- Actualizar la función auto_assign_membership_holder para considerar solo usuarios activos
CREATE OR REPLACE FUNCTION public.auto_assign_membership_holder()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  existing_holder_count integer;
BEGIN
  -- Solo procesar si se está insertando un nuevo usuario con member_id
  IF TG_OP = 'INSERT' AND NEW.member_id IS NOT NULL THEN
    -- Verificar si ya existe un titular activo para este member_id
    SELECT COUNT(*) INTO existing_holder_count
    FROM profiles 
    WHERE member_id = NEW.member_id 
      AND is_membership_holder = true
      AND is_active = true;
    
    -- Si no hay titular activo, hacer a este usuario el titular
    IF existing_holder_count = 0 THEN
      NEW.is_membership_holder = true;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;