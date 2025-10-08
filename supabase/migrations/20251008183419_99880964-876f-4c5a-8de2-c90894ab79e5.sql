-- =====================================================
-- VERIFICAR Y LIMPIAR POLÍTICAS DE valid_member_ids
-- =====================================================

-- Buscar política pública específica mencionada en el error
DROP POLICY IF EXISTS "Allow all read access to valid member IDs" ON public.valid_member_ids;

-- Verificar si hay políticas anónimas o públicas restantes
DO $$
DECLARE
  policy_record RECORD;
  policy_count INTEGER := 0;
BEGIN
  RAISE NOTICE '=== POLÍTICAS ACTUALES EN valid_member_ids ===';
  
  FOR policy_record IN 
    SELECT 
      policyname,
      cmd,
      roles::text,
      qual,
      with_check
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'valid_member_ids'
    ORDER BY policyname
  LOOP
    policy_count := policy_count + 1;
    RAISE NOTICE 'Política %: %', policy_count, policy_record.policyname;
    RAISE NOTICE '  Comando: %', policy_record.cmd;
    RAISE NOTICE '  Roles: %', policy_record.roles;
    RAISE NOTICE '  USING: %', policy_record.qual;
    RAISE NOTICE '  WITH CHECK: %', policy_record.with_check;
    RAISE NOTICE '---';
  END LOOP;
  
  IF policy_count = 0 THEN
    RAISE NOTICE 'No se encontraron políticas (esto es un problema - debe haber políticas restrictivas)';
  ELSE
    RAISE NOTICE 'Total de políticas encontradas: %', policy_count;
  END IF;
  
  -- Verificar que RLS esté habilitado
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename = 'valid_member_ids' 
      AND rowsecurity = true
  ) THEN
    RAISE NOTICE '✅ RLS está HABILITADO en valid_member_ids';
  ELSE
    RAISE NOTICE '❌ RLS está DESHABILITADO en valid_member_ids';
  END IF;
END $$;