
-- Fix instructor contact information exposure by restricting direct table access
-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Restricted instructor data access" ON public.instructors;

-- Create a new restrictive policy: only admins and the instructor themselves can see full data
-- This prevents scraping of email/phone by anyone who knows an instructor_id
CREATE POLICY "Admins and self can view full instructor data"
ON public.instructors
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
  OR auth.uid() = user_id
);

-- Note: The application code already filters columns appropriately:
-- - useInstructors() and useInstructor() only select non-PII fields
-- - useInstructorWithPII() is used only by admins for full access
-- - The get_instructor_contact() function already restricts email/phone access
