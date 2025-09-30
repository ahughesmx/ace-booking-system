-- SECURITY FIX: Revert the dangerous "OR true" policy

-- Drop the insecure policy
DROP POLICY IF EXISTS "Restricted profile access" ON profiles;

-- Restore the secure policy without public access
CREATE POLICY "Restricted profile access"
ON profiles
FOR SELECT
USING (
  auth.uid() = id 
  OR public.is_admin()
  OR public.is_admin_or_operator()
  OR public.is_family_member(auth.uid(), id)
);

-- The display should use the display_bookings_combined view instead of direct queries
-- That view uses SECURITY DEFINER functions to safely expose only names