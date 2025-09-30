-- ============================================
-- SECURITY FIX: Restrict Instructor Personal Information Access
-- ============================================

-- Drop the overly permissive instructor access policy
DROP POLICY IF EXISTS "Restricted instructor access" ON instructors;

-- Create new restrictive policy for viewing instructors
-- Only expose full data to admins and the instructor themselves
CREATE POLICY "Restricted instructor data access"
ON instructors FOR SELECT
USING (
  -- Admins can view all instructor data
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
  OR
  -- Instructors can view their own full data
  (auth.uid() = user_id)
);

-- Drop and recreate the public view for instructor information
DROP VIEW IF EXISTS instructor_public_info CASCADE;

CREATE VIEW instructor_public_info AS
SELECT 
  id,
  full_name,
  bio,
  specialties,
  certifications,
  avatar_url,
  experience_years,
  is_active,
  created_at,
  updated_at
FROM instructors
WHERE is_active = true;

ALTER VIEW instructor_public_info SET (security_invoker = true);

COMMENT ON VIEW instructor_public_info IS 
'Public view of instructor information without sensitive contact details (no email or phone).';

-- Create a secure function to get instructor contact info
-- Only admins or the instructor themselves can access contact details
CREATE OR REPLACE FUNCTION get_instructor_contact(instructor_id uuid)
RETURNS TABLE (
  email text,
  phone text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only return contact info if requester is:
  -- 1. An admin
  -- 2. The instructor themselves
  RETURN QUERY
  SELECT 
    i.email,
    i.phone
  FROM instructors i
  WHERE i.id = instructor_id
    AND (
      EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND role = 'admin')
      OR i.user_id = auth.uid()
    );
END;
$$;

COMMENT ON FUNCTION get_instructor_contact IS 
'Securely retrieves instructor contact information with proper access control. Only admins and the instructor themselves can access.';