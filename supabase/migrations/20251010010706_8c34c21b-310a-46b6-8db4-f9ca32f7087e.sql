-- Paso 2 (corregido): Actualizar políticas RLS para incluir supervisor

-- 1. BOOKINGS: Supervisores pueden ver y actualizar todas las reservas
DROP POLICY IF EXISTS "Family members and admins can update bookings" ON public.bookings;

CREATE POLICY "Family members, admins, operators and supervisors can update bookings"
ON public.bookings
FOR UPDATE
USING (
  auth.uid() = user_id 
  OR public.is_family_member(auth.uid(), user_id)
  OR (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'operador', 'supervisor')
  ))
);

-- 2. AFFECTED_BOOKINGS: Supervisores pueden actualizar reservas afectadas
DROP POLICY IF EXISTS "Admins y sistema pueden actualizar reservas afectadas" ON public.affected_bookings;

CREATE POLICY "Admins, supervisors y sistema pueden actualizar reservas afectadas"
ON public.affected_bookings
FOR UPDATE
USING (
  (EXISTS (
    SELECT 1 FROM bookings 
    WHERE id = affected_bookings.booking_id 
    AND user_id = auth.uid()
  ))
  OR (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'supervisor')
  ))
);

-- 3. PROFILES: Supervisores pueden ver y actualizar perfiles (para desactivar usuarios)
DROP POLICY IF EXISTS "Supervisors can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Supervisors can update profiles for user management" ON public.profiles;

CREATE POLICY "Supervisors can view all profiles"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id 
  OR is_admin() 
  OR is_admin_or_operator()
  OR is_family_member(auth.uid(), id)
  OR (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'supervisor'
  ))
);

CREATE POLICY "Supervisors can update profiles for user management"
ON public.profiles
FOR UPDATE
USING (
  auth.uid() = id 
  OR (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'supervisor')
  ))
);

-- 4. RECEIPT_NUMBERS: Supervisores pueden ver todos los folios para reportes
DROP POLICY IF EXISTS "Only admins and operators can view receipt numbers" ON public.receipt_numbers;

CREATE POLICY "Admins, operators and supervisors can view receipt numbers"
ON public.receipt_numbers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'operador', 'supervisor')
  )
);

-- 5. Crear función helper para verificar si es supervisor
CREATE OR REPLACE FUNCTION public.is_supervisor()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'supervisor'
  );
$$;

-- 6. REEMPLAZAR (no DROP) función is_admin_or_operator para incluir supervisor
CREATE OR REPLACE FUNCTION public.is_admin_or_operator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'operador', 'supervisor')
  );
$$;

COMMENT ON FUNCTION public.is_supervisor() IS 'Verifica si el usuario actual tiene rol de supervisor';
COMMENT ON FUNCTION public.is_admin_or_operator() IS 'Verifica si el usuario actual es admin, operador o supervisor';