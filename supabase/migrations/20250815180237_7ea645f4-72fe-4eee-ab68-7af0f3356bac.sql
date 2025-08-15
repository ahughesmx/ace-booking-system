-- Limpiar reservas expiradas y recalcular conteos de reservas activas
-- Eliminar reservas que han expirado y están pendientes de pago
DELETE FROM public.bookings 
WHERE status = 'pending_payment' 
  AND expires_at < NOW();

-- Recalcular el conteo de reservas activas para todos los usuarios
-- usando la función existente
SELECT public.recalculate_active_bookings();

-- Crear un trigger mejorado para limpiar reservas expiradas automáticamente
-- cuando se intente insertar una nueva reserva
CREATE OR REPLACE FUNCTION public.cleanup_expired_before_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Limpiar reservas expiradas antes de validar la nueva reserva
  DELETE FROM public.bookings 
  WHERE status = 'pending_payment' 
    AND expires_at < NOW();
  
  -- Recalcular conteos para el usuario que está haciendo la reserva
  PERFORM public.recalculate_active_bookings(NEW.user_id);
  
  RETURN NEW;
END;
$$;

-- Crear el trigger que se ejecute antes de insertar una nueva reserva
DROP TRIGGER IF EXISTS cleanup_expired_before_booking_trigger ON public.bookings;
CREATE TRIGGER cleanup_expired_before_booking_trigger
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_expired_before_booking();