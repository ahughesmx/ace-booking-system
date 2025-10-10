-- Actualizar políticas RLS para permitir a supervisores gestionar canchas

-- 1. Canchas (courts)
DROP POLICY IF EXISTS "courts_admin_policy" ON public.courts;

CREATE POLICY "Admins and supervisors can manage courts"
ON public.courts
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'supervisor')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'supervisor')
  )
);

-- 2. Tipos de cancha disponibles (available_court_types)
DROP POLICY IF EXISTS "Only admins can manage available court types" ON public.available_court_types;

CREATE POLICY "Admins and supervisors can manage available court types"
ON public.available_court_types
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'supervisor')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'supervisor')
  )
);

-- 3. Mantenimiento de canchas (court_maintenance)
DROP POLICY IF EXISTS "Admins can manage court maintenance" ON public.court_maintenance;

CREATE POLICY "Admins and supervisors can manage court maintenance"
ON public.court_maintenance
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'supervisor')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'supervisor')
  )
);