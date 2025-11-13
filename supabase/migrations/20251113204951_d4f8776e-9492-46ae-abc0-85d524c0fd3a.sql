-- 1. Agregar campos de pago a special_bookings
ALTER TABLE public.special_bookings
ADD COLUMN IF NOT EXISTS processed_by uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS payment_completed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS payment_method text CHECK (payment_method IN ('efectivo', 'online')),
ADD COLUMN IF NOT EXISTS status text DEFAULT 'paid' CHECK (status IN ('paid', 'cancelled'));

-- 2. Crear función para calcular precio de reserva especial
CREATE OR REPLACE FUNCTION public.calculate_special_booking_price(
  p_price_type text,
  p_custom_price numeric,
  p_court_id uuid,
  p_start_time timestamp with time zone,
  p_end_time timestamp with time zone
) RETURNS numeric AS $$
DECLARE
  court_type_name text;
  price_per_hour numeric;
  duration_hours numeric;
BEGIN
  -- Si es gratis, retornar 0
  IF p_price_type = 'free' THEN
    RETURN 0;
  END IF;
  
  -- Si tiene precio personalizado, retornarlo
  IF p_price_type = 'custom' AND p_custom_price IS NOT NULL THEN
    RETURN p_custom_price;
  END IF;
  
  -- Si es precio normal, calcular basado en settings
  IF p_price_type = 'normal' THEN
    -- Obtener tipo de cancha
    SELECT court_type INTO court_type_name FROM public.courts WHERE id = p_court_id;
    
    -- Obtener precio por hora (usar operador_price_per_hour por defecto)
    SELECT COALESCE(operador_price_per_hour, price_per_hour) 
    INTO price_per_hour
    FROM public.court_type_settings 
    WHERE court_type = court_type_name;
    
    -- Calcular duración en horas
    duration_hours := EXTRACT(EPOCH FROM (p_end_time - p_start_time)) / 3600.0;
    
    RETURN price_per_hour * duration_hours;
  END IF;
  
  RETURN 0;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 3. Crear vista combinada para reportes
CREATE OR REPLACE VIEW public.combined_bookings_for_reports AS
SELECT 
  b.id,
  b.start_time,
  b.end_time,
  b.actual_amount_charged as amount,
  b.payment_method,
  b.booking_made_at as payment_completed_at,
  b.status,
  b.user_id,
  b.court_id,
  b.processed_by,
  'regular' as booking_type,
  null::text as title,
  null::text as event_type
FROM public.bookings b
WHERE b.status IN ('paid', 'cancelled')

UNION ALL

SELECT
  sb.id,
  sb.start_time,
  sb.end_time,
  calculate_special_booking_price(
    sb.price_type,
    sb.custom_price,
    sb.court_id,
    sb.start_time,
    sb.end_time
  ) as amount,
  sb.payment_method,
  sb.payment_completed_at,
  sb.status,
  sb.reference_user_id as user_id,
  sb.court_id,
  sb.processed_by,
  'special' as booking_type,
  sb.title,
  sb.event_type
FROM public.special_bookings sb
WHERE sb.status IN ('paid', 'cancelled')
  AND sb.payment_completed_at IS NOT NULL;

-- 4. Actualizar RLS policies para special_bookings
DROP POLICY IF EXISTS "Operadores pueden gestionar reservas especiales" ON public.special_bookings;
CREATE POLICY "Operadores pueden gestionar reservas especiales"
ON public.special_bookings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'operador', 'supervisor')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'operador', 'supervisor')
  )
);

-- 5. Crear policy para vista de reportes combinados
-- Nota: Las vistas en Postgres heredan las políticas RLS de sus tablas subyacentes
-- por lo que no necesitamos políticas explícitas para la vista