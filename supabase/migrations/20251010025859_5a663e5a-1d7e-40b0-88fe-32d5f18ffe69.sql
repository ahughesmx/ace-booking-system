-- ============================================
-- SECURITY FIX: Restrict direct access to instructors table
-- ============================================
-- This migration strengthens RLS policies on the instructors table to ensure
-- that PII (email, phone) is NEVER accessible except to admins and the instructor themselves.
-- 
-- Changes:
-- 1. Drop the overly permissive SELECT policy
-- 2. Create a more restrictive SELECT policy that only allows:
--    - Admins to see all instructor data
--    - Instructors to see ONLY their own data (via user_id match)
-- 3. Add explicit documentation that the public view should be used for general access
--
-- This prevents any potential data harvesting even if an attacker knows instructor IDs.

-- Drop the old policy
DROP POLICY IF EXISTS "Admins and self can view full instructor data" ON public.instructors;

-- Create a new, more explicit and restrictive SELECT policy
-- This policy ONLY allows:
-- 1. Admins (via user_roles check)
-- 2. The instructor themselves (via user_id = auth.uid())
CREATE POLICY "instructors_select_restricted"
ON public.instructors
FOR SELECT
TO authenticated
USING (
  -- Must be an admin
  EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
      AND role = 'admin'
  )
  OR
  -- OR must be the instructor themselves (user_id must match)
  (user_id IS NOT NULL AND user_id = auth.uid())
);

-- Add a comment to document the security architecture
COMMENT ON TABLE public.instructors IS 
'SECURITY: This table contains PII (email, phone). Direct SELECT access is restricted to admins and self only. 
For public/general access, use the instructor_public_info view which excludes sensitive data.
Frontend code should use instructor_public_info for displaying instructor lists.';

COMMENT ON VIEW public.instructor_public_info IS
'SECURITY: Public view of instructors that excludes PII (email, phone). 
This view should be used for general instructor listings and public-facing pages.
Only admins should query the instructors table directly for management purposes.';