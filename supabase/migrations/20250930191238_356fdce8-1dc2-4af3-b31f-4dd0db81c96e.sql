-- ============================================
-- FIX: Allow operators to view user profiles
-- ============================================

-- Update the profile access policy to include operators
DROP POLICY IF EXISTS "Restricted profile access" ON profiles;

CREATE POLICY "Restricted profile access"
ON profiles
FOR SELECT
USING (
  auth.uid() = id 
  OR public.is_admin()
  OR public.is_admin_or_operator()
  OR public.is_family_member(auth.uid(), id)
);