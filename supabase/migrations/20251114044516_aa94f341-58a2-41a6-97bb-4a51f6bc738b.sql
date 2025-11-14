-- Reemplazar función RPC para soportar filtros de fecha y operador
DROP FUNCTION IF EXISTS get_combined_bookings_for_reports();

CREATE OR REPLACE FUNCTION get_combined_bookings_for_reports(
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_operator_id uuid DEFAULT NULL
)
RETURNS SETOF combined_bookings_for_reports
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Validar que el usuario es admin o supervisor
  IF NOT EXISTS (
    SELECT 1 
    FROM user_roles 
    WHERE user_id = auth.uid() 
      AND role IN ('admin', 'supervisor')
  ) THEN
    RAISE EXCEPTION 'Solo administradores y supervisores pueden acceder a reportes financieros';
  END IF;
  
  -- Retornar datos filtrados de la vista
  RETURN QUERY
  SELECT * FROM combined_bookings_for_reports
  WHERE 
    (p_start_date IS NULL OR payment_completed_at >= p_start_date)
    AND (p_end_date IS NULL OR payment_completed_at <= p_end_date)
    AND (p_operator_id IS NULL OR processed_by = p_operator_id)
  ORDER BY payment_completed_at DESC;
END;
$$;