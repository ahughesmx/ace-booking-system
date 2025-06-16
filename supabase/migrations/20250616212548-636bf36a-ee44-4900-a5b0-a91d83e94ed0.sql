
-- Verificar si los triggers existen y recrearlos con la lógica correcta
DROP TRIGGER IF EXISTS booking_active_count_trigger ON bookings;

-- Recrear la función para actualizar active_bookings
CREATE OR REPLACE FUNCTION public.update_active_bookings()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Incrementar contador para el usuario de la nueva reserva
    UPDATE profiles 
    SET active_bookings = (
      SELECT COUNT(*)
      FROM bookings
      WHERE user_id = NEW.user_id
      AND (
        end_time > NOW() 
        OR 
        (end_time <= NOW() AND end_time > NOW() - INTERVAL '2 hours')
      )
    )
    WHERE id = NEW.user_id;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Recalcular contador para el usuario de la reserva eliminada
    UPDATE profiles 
    SET active_bookings = (
      SELECT COUNT(*)
      FROM bookings
      WHERE user_id = OLD.user_id
      AND (
        end_time > NOW() 
        OR 
        (end_time <= NOW() AND end_time > NOW() - INTERVAL '2 hours')
      )
    )
    WHERE id = OLD.user_id;
    
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Recalcular para ambos usuarios si el user_id cambió
    IF OLD.user_id IS DISTINCT FROM NEW.user_id THEN
      -- Recalcular para el usuario anterior
      UPDATE profiles 
      SET active_bookings = (
        SELECT COUNT(*)
        FROM bookings
        WHERE user_id = OLD.user_id
        AND (
          end_time > NOW() 
          OR 
          (end_time <= NOW() AND end_time > NOW() - INTERVAL '2 hours')
        )
      )
      WHERE id = OLD.user_id;
      
      -- Recalcular para el nuevo usuario
      UPDATE profiles 
      SET active_bookings = (
        SELECT COUNT(*)
        FROM bookings
        WHERE user_id = NEW.user_id
        AND (
          end_time > NOW() 
          OR 
          (end_time <= NOW() AND end_time > NOW() - INTERVAL '2 hours')
        )
      )
      WHERE id = NEW.user_id;
    ELSE
      -- Solo recalcular para el usuario actual si cambió el tiempo
      UPDATE profiles 
      SET active_bookings = (
        SELECT COUNT(*)
        FROM bookings
        WHERE user_id = NEW.user_id
        AND (
          end_time > NOW() 
          OR 
          (end_time <= NOW() AND end_time > NOW() - INTERVAL '2 hours')
        )
      )
      WHERE id = NEW.user_id;
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$function$;

-- Crear el trigger para que se ejecute en INSERT, UPDATE y DELETE
CREATE TRIGGER booking_active_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_active_bookings();

-- Recalcular todos los contadores existentes para asegurar consistencia
UPDATE profiles 
SET active_bookings = (
  SELECT COUNT(*)
  FROM bookings
  WHERE user_id = profiles.id
  AND (
    end_time > NOW() 
    OR 
    (end_time <= NOW() AND end_time > NOW() - INTERVAL '2 hours')
  )
);
