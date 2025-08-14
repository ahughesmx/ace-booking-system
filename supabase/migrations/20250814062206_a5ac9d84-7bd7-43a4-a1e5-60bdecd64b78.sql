-- Arreglar problemas de seguridad: configurar search_path para las funciones existentes sin él

-- Función para limpiar reservas expiradas
CREATE OR REPLACE FUNCTION public.cleanup_expired_bookings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Eliminar reservas que han expirado y no han sido pagadas
  DELETE FROM bookings 
  WHERE status = 'pending_payment' 
    AND expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- Función para invalidar cache de reservas
CREATE OR REPLACE FUNCTION public.invalidate_booking_cache()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Esta función se ejecuta cuando se actualizan court_type_settings
  -- Para notificar que las validaciones pueden haber cambiado
  NOTIFY court_settings_updated, 'Court type settings have been updated';
  RETURN NEW;
END;
$$;

-- Función para manejar nuevos usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$;