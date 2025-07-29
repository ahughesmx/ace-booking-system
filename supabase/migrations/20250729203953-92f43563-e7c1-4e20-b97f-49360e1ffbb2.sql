-- Corregir funciones con search_path mutable
CREATE OR REPLACE FUNCTION calculate_booking_expiration(booking_time TIMESTAMPTZ)
RETURNS TIMESTAMPTZ
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT booking_time + (
    SELECT INTERVAL '1 minute' * payment_timeout_minutes 
    FROM public.payment_settings 
    LIMIT 1
  )
$$;

CREATE OR REPLACE FUNCTION set_booking_expiration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'pending_payment' AND NEW.expires_at IS NULL THEN
    NEW.expires_at := public.calculate_booking_expiration(NOW());
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION cleanup_expired_bookings()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Eliminar reservas que han expirado y no han sido pagadas
  DELETE FROM public.bookings 
  WHERE status = 'pending_payment' 
    AND expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;