-- Crear función RPC para acceder a reportes financieros de forma segura
-- Solo admins y supervisores pueden ejecutarla
CREATE OR REPLACE FUNCTION get_combined_bookings_for_reports()
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
  
  -- Retornar datos de la vista
  RETURN QUERY
  SELECT * FROM combined_bookings_for_reports;
END;
$$;