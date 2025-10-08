-- =====================================================
-- MIGRACIÓN DE SEGURIDAD SIN ROMPER FUNCIONALIDAD
-- =====================================================
-- Display.tsx ya usa la vista display_bookings_combined
-- Los componentes de admin ya tienen autenticación
-- =====================================================

-- 1. ELIMINAR política pública de bookings (expone payment_id, amounts, etc.)
DROP POLICY IF EXISTS "Public can view bookings for display" ON public.bookings;

-- 2. RESTRINGIR valid_member_ids solo a admin/operador
-- (el frontend solo la usa en componentes protegidos)
DROP POLICY IF EXISTS "Anyone can view valid member IDs" ON public.valid_member_ids;

CREATE POLICY "Admin/Operador can view valid member IDs"
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

-- NOTA: Display.tsx seguirá funcionando porque usa display_bookings_combined
-- NOTA: Todos los componentes que usan valid_member_ids son de admin/operador