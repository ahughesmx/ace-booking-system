-- SOLUCIONAR WARNINGS DE SEGURIDAD: Function Search Path

-- 1. ARREGLAR LA FUNCIÓN DE BÚSQUEDA con search_path seguro
DROP FUNCTION IF EXISTS public.search_users_for_invitations(text);

CREATE OR REPLACE FUNCTION public.search_users_for_invitations(search_term text)
RETURNS TABLE (
  id uuid,
  full_name text,
  member_id text
) 
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO ''
AS $$
BEGIN
  -- Solo usuarios autenticados pueden usar esta función
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Access denied: user not authenticated';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.member_id
  FROM public.profiles p
  WHERE 
    p.full_name IS NOT NULL 
    AND p.full_name != ''
    AND p.id != auth.uid() -- Excluir al usuario actual
    AND (
      p.full_name ILIKE '%' || search_term || '%' OR
      p.member_id ILIKE '%' || search_term || '%'
    )
  ORDER BY p.full_name
  LIMIT 10;
END;
$$;

-- 2. ARREGLAR FUNCIÓN is_admin con search_path seguro
DROP FUNCTION IF EXISTS public.is_admin();

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
      AND role = 'admin'
  );
$$;

-- 3. ARREGLAR TODAS LAS DEMÁS FUNCIONES con search_path seguro
-- Función recalculate_active_bookings
DROP FUNCTION IF EXISTS public.recalculate_active_bookings(uuid);

CREATE OR REPLACE FUNCTION public.recalculate_active_bookings(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  active_count integer;
BEGIN
  -- Count active bookings for the user
  SELECT COUNT(*) INTO active_count
  FROM public.bookings
  WHERE user_id = user_uuid
    AND end_time > now();
  
  -- Update the user's active_bookings count
  UPDATE public.profiles
  SET active_bookings = active_count
  WHERE id = user_uuid;
END;
$$;

-- 4. ARREGLAR FUNCIÓN calculate_booking_expiration
DROP FUNCTION IF EXISTS public.calculate_booking_expiration(timestamp with time zone);

CREATE OR REPLACE FUNCTION public.calculate_booking_expiration(booking_time timestamp with time zone)
RETURNS timestamp with time zone
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT booking_time + (
    SELECT INTERVAL '1 minute' * payment_timeout_minutes 
    FROM public.payment_settings 
    LIMIT 1
  )
$$;