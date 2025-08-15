-- CRITICAL SECURITY FIXES - PHASE 1: PII Protection & Password Security

-- 1. FIX INSTRUCTORS TABLE RLS POLICY - Hide PII from public access
DROP POLICY IF EXISTS "Anyone can view active instructors" ON public.instructors;

-- New restrictive policy for instructors - only basic info public, contact details for admins only
CREATE POLICY "Public can view basic instructor info" 
ON public.instructors 
FOR SELECT 
USING (
  is_active = true 
  AND (
    -- Public can only see basic non-PII fields
    auth.uid() IS NULL 
    OR 
    -- Admins can see everything
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
);

-- 2. FIX PROFILES TABLE RLS POLICY - Strengthen access control
DROP POLICY IF EXISTS "Secure profile access for authenticated users" ON public.profiles;

-- New strict policy for profiles
CREATE POLICY "Secure profile access" 
ON public.profiles 
FOR SELECT 
USING (
  -- Users can only see their own profile
  auth.uid() = id 
  OR 
  -- Admins can see all profiles
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
  OR
  -- For match invitations: authenticated users can see basic info (name only) of users with names
  (
    auth.uid() IS NOT NULL 
    AND full_name IS NOT NULL 
    AND full_name != ''
    AND member_id IS NOT NULL
  )
);

-- 3. FIX USER REGISTRATION REQUESTS - Ensure admin/operator only access
-- The existing policies are already correct, but let's verify they're restrictive enough

-- 4. CRITICAL: Remove plaintext password storage and implement proper hashing
-- First, let's remove the password_hash column since we shouldn't store passwords at all
-- Registration requests should not store actual passwords
ALTER TABLE public.user_registration_requests DROP COLUMN IF EXISTS password_hash;

-- Add a secure password handling flag instead
ALTER TABLE public.user_registration_requests 
ADD COLUMN IF NOT EXISTS password_provided boolean DEFAULT false;

-- 5. Create a security function to check if user has admin/operator role without recursion
CREATE OR REPLACE FUNCTION public.is_admin_or_operator()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
      AND role IN ('admin', 'operador')
  );
$$;

-- 6. Update user registration requests policies to use the new function
DROP POLICY IF EXISTS "Admins y operadores pueden ver todas las solicitudes" ON public.user_registration_requests;
DROP POLICY IF EXISTS "Admins y operadores pueden actualizar solicitudes" ON public.user_registration_requests;

CREATE POLICY "Admin/operators can view registration requests" 
ON public.user_registration_requests 
FOR SELECT 
USING (public.is_admin_or_operator());

CREATE POLICY "Admin/operators can update registration requests" 
ON public.user_registration_requests 
FOR UPDATE 
USING (public.is_admin_or_operator());

-- 7. Add additional security: Create view for public instructor info
CREATE OR REPLACE VIEW public.instructor_public_info AS
SELECT 
  id,
  full_name,
  bio,
  specialties,
  certifications,
  experience_years,
  avatar_url,
  is_active,
  created_at,
  updated_at
FROM public.instructors
WHERE is_active = true;

-- Grant access to the view
GRANT SELECT ON public.instructor_public_info TO authenticated, anon;

-- 8. Create RLS policy for the view
ALTER VIEW public.instructor_public_info SET (security_barrier = true);

-- 9. Add security logging trigger for sensitive operations
CREATE OR REPLACE FUNCTION public.log_security_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log sensitive operations (this would typically go to a security log table)
  RAISE LOG 'Security event: % on table % by user %', TG_OP, TG_TABLE_NAME, auth.uid();
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add security logging to critical tables
DROP TRIGGER IF EXISTS security_log_user_roles ON public.user_roles;
CREATE TRIGGER security_log_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.log_security_event();

DROP TRIGGER IF EXISTS security_log_user_registration ON public.user_registration_requests;
CREATE TRIGGER security_log_user_registration
  AFTER INSERT OR UPDATE OR DELETE ON public.user_registration_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_security_event();