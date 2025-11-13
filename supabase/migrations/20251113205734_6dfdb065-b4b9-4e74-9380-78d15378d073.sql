-- Corregir función SIN hacer DROP (ya que la vista depende de ella)
-- Solo usar CREATE OR REPLACE para actualizar la implementación
CREATE OR REPLACE FUNCTION public.calculate_special_booking_price(
  p_price_type text,
  p_custom_price numeric,
  p_court_id uuid,
  p_start_time timestamp with time zone,
  p_end_time timestamp with time zone
) RETURNS numeric AS $$
DECLARE
  v_court_type_name text;
  v_price_per_hour numeric;
  v_duration_hours numeric;
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
    SELECT c.court_type INTO v_court_type_name 
    FROM public.courts c 
    WHERE c.id = p_court_id;
    
    -- Obtener precio por hora (usar operador_price_per_hour por defecto)
    SELECT COALESCE(cts.operador_price_per_hour, cts.price_per_hour) 
    INTO v_price_per_hour
    FROM public.court_type_settings cts
    WHERE cts.court_type = v_court_type_name;
    
    -- Calcular duración en horas
    v_duration_hours := EXTRACT(EPOCH FROM (p_end_time - p_start_time)) / 3600.0;
    
    RETURN v_price_per_hour * v_duration_hours;
  END IF;
  
  RETURN 0;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;