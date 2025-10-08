-- =====================================================
-- CORREGIR ACCESO PÚBLICO A valid_member_ids
-- =====================================================
-- La tabla sigue siendo públicamente accesible
-- Necesitamos eliminar TODAS las políticas públicas
-- y mantener solo acceso para admin/operador
-- =====================================================

-- 1. Ver políticas actuales (para debugging)
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'valid_member_ids'
  LOOP
    RAISE NOTICE 'Política encontrada: %', policy_record.policyname;
  END LOOP;
END $$;

-- 2. Eliminar TODAS las políticas existentes de valid_member_ids
DROP POLICY IF EXISTS "Anyone can view valid member IDs" ON public.valid_member_ids;
DROP POLICY IF EXISTS "Allow all read access to valid member IDs" ON public.valid_member_ids;
DROP POLICY IF EXISTS "Public can view valid member IDs" ON public.valid_member_ids;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.valid_member_ids;
DROP POLICY IF EXISTS "Admin/Operador can view valid member IDs" ON public.valid_member_ids;
DROP POLICY IF EXISTS "Admins can manage valid member IDs" ON public.valid_member_ids;
DROP POLICY IF EXISTS "Only admins can delete valid member IDs" ON public.valid_member_ids;
DROP POLICY IF EXISTS "Only admins can insert valid member IDs" ON public.valid_member_ids;

-- 3. Verificar que RLS esté habilitado
ALTER TABLE public.valid_member_ids ENABLE ROW LEVEL SECURITY;

-- 4. Crear políticas restrictivas SOLO para admin/operador
CREATE POLICY "Admin/Operador can SELECT valid_member_ids"
ON public.valid_member_ids
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'operador')
  )
);

CREATE POLICY "Admin/Operador can INSERT valid_member_ids"
ON public.valid_member_ids
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'operador')
  )
);

CREATE POLICY "Admin/Operador can UPDATE valid_member_ids"
ON public.valid_member_ids
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'operador')
  )
);

CREATE POLICY "Admin/Operador can DELETE valid_member_ids"
ON public.valid_member_ids
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'operador')
  )
);

-- 5. Verificación final
DO $$
BEGIN
  RAISE NOTICE '✅ Políticas RLS configuradas correctamente para valid_member_ids';
  RAISE NOTICE 'Solo admin y operador pueden acceder a esta tabla';
END $$;