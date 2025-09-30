-- ============================================
-- FIX: Infinite recursion in profiles RLS
-- ============================================

-- Create security definer function to check if users share the same membership
CREATE OR REPLACE FUNCTION public.is_family_member(_user_id uuid, _target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p1, profiles p2
    WHERE p1.id = _user_id
      AND p2.id = _target_user_id
      AND p1.member_id = p2.member_id
      AND p1.member_id IS NOT NULL
      AND p1.is_active = true
      AND p2.is_active = true
  )
$$;

-- Drop and recreate the profile access policy without recursion
DROP POLICY IF EXISTS "Restricted profile access" ON profiles;

CREATE POLICY "Restricted profile access"
ON profiles
FOR SELECT
USING (
  auth.uid() = id 
  OR public.is_admin()
  OR public.is_family_member(auth.uid(), id)
);