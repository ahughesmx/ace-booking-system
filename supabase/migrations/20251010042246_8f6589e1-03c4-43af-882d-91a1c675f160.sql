-- ============================================================================
-- SECURITY FIX: Protect Instructor Contact Information (Email & Phone)
-- ============================================================================
-- Issue: Any authenticated user can access email/phone of all instructors
-- Solution: Restrict direct table access to admins and the instructor themselves
-- Public access should use the instructor_public_info view instead
-- ============================================================================

-- Drop existing overly permissive policy
DROP POLICY IF EXISTS "instructors_select_restricted" ON public.instructors;

-- Create new restrictive policy: Only admins and the instructor themselves can view full details
CREATE POLICY "Admins and self can view instructor details"
ON public.instructors
FOR SELECT
TO authenticated
USING (
  -- Admin can see all instructors
  (EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  ))
  OR
  -- Instructor can see their own record
  (user_id IS NOT NULL AND user_id = auth.uid())
);

-- Keep existing policies for instructors updating their own profile
-- (This policy already exists and is correct)

-- Add comment to remind developers to use the public view
COMMENT ON TABLE public.instructors IS 
'SECURITY: This table contains PII (email, phone). For public/non-admin access, use instructor_public_info view instead. Direct SELECT is restricted to admins and the instructor themselves.';