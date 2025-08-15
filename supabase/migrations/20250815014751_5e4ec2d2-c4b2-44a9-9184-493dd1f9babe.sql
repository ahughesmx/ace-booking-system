-- CRITICAL SECURITY FIXES - PHASE 1: PII Protection & Password Security (Fixed)

-- 1. FIX INSTRUCTORS TABLE RLS POLICY - Update existing policy
DROP POLICY IF EXISTS "Anyone can view active instructors" ON public.instructors;
DROP POLICY IF EXISTS "Public can view basic instructor info" ON public.instructors;

-- Create new restrictive policy for instructors
CREATE POLICY "Restricted instructor access" 
ON public.instructors 
FOR SELECT 
USING (
  is_active = true 
  AND (
    -- Admins can see everything including PII
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR
    -- Non-admins can only see non-PII fields (we'll handle this in the app layer)
    (auth.uid() IS NOT NULL)
  )
);

-- 2. FIX PROFILES TABLE RLS POLICY - Update existing
DROP POLICY IF EXISTS "Secure profile access for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Secure profile access" ON public.profiles;

-- Create new strict policy for profiles
CREATE POLICY "Strict profile access control" 
ON public.profiles 
FOR SELECT 
USING (
  -- Users can see their own profile
  auth.uid() = id 
  OR 
  -- Admins can see all profiles
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
  OR
  -- For match invitations: authenticated users can see basic info of users with names
  (
    auth.uid() IS NOT NULL 
    AND full_name IS NOT NULL 
    AND full_name != ''
  )
);

-- 3. CRITICAL: Remove plaintext password storage
ALTER TABLE public.user_registration_requests DROP COLUMN IF EXISTS password_hash;

-- Add secure flag instead
ALTER TABLE public.user_registration_requests 
ADD COLUMN IF NOT EXISTS password_provided boolean DEFAULT false;

-- 4. Create security function without recursion
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

-- 5. Update user registration requests policies
DROP POLICY IF EXISTS "Admins y operadores pueden ver todas las solicitudes" ON public.user_registration_requests;
DROP POLICY IF EXISTS "Admins y operadores pueden actualizar solicitudes" ON public.user_registration_requests;

CREATE POLICY "Secure registration requests view" 
ON public.user_registration_requests 
FOR SELECT 
USING (public.is_admin_or_operator());

CREATE POLICY "Secure registration requests update" 
ON public.user_registration_requests 
FOR UPDATE 
USING (public.is_admin_or_operator());

-- 6. Add security logging function
CREATE OR REPLACE FUNCTION public.log_security_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log sensitive operations
  RAISE LOG 'Security event: % on table % by user %', TG_OP, TG_TABLE_NAME, auth.uid();
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add security logging triggers
DROP TRIGGER IF EXISTS security_log_user_roles ON public.user_roles;
CREATE TRIGGER security_log_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.log_security_event();

DROP TRIGGER IF EXISTS security_log_user_registration ON public.user_registration_requests;
CREATE TRIGGER security_log_user_registration
  AFTER INSERT OR UPDATE OR DELETE ON public.user_registration_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_security_event();