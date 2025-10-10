-- Crear función para que supervisores puedan desactivar/activar usuarios
CREATE OR REPLACE FUNCTION public.supervisor_toggle_user_status(
  p_user_id_to_toggle uuid,
  p_new_status boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_user_role user_role;
  requesting_user_role user_role;
BEGIN
  -- Verificar que el usuario solicitante es supervisor o admin
  SELECT role INTO requesting_user_role
  FROM user_roles
  WHERE user_id = auth.uid();
  
  IF requesting_user_role NOT IN ('supervisor', 'admin') THEN
    RAISE EXCEPTION 'Solo supervisores y administradores pueden cambiar el estado de usuarios';
  END IF;
  
  -- Obtener el rol del usuario objetivo
  SELECT role INTO target_user_role
  FROM user_roles
  WHERE user_id = p_user_id_to_toggle;
  
  -- Supervisores no pueden desactivar a otros supervisores o admins
  IF requesting_user_role = 'supervisor' AND target_user_role IN ('supervisor', 'admin') THEN
    RAISE EXCEPTION 'Los supervisores no pueden cambiar el estado de otros supervisores o administradores';
  END IF;
  
  -- Realizar el cambio de estado
  UPDATE profiles 
  SET 
    is_active = p_new_status,
    deactivated_at = CASE WHEN p_new_status THEN NULL ELSE now() END,
    deactivated_by = CASE WHEN p_new_status THEN NULL ELSE auth.uid() END,
    updated_at = now()
  WHERE id = p_user_id_to_toggle;
  
  RETURN true;
END;
$$;

-- Agregar comentario a la función
COMMENT ON FUNCTION public.supervisor_toggle_user_status IS 
'Permite a supervisores y admins activar/desactivar usuarios. Supervisores no pueden afectar a otros supervisores o admins.';