-- ============================================
-- SECURITY FIX: Restrict Public Access to Profiles
-- ============================================

-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Public can view profiles for display" ON profiles;

-- Update the strict profile access control policy to remove public access
-- Users can only view: their own profile, profiles in their family (same member_id), or if they're admin
DROP POLICY IF EXISTS "Strict profile access control" ON profiles;

CREATE POLICY "Restricted profile access"
ON profiles FOR SELECT
USING (
  -- User viewing their own profile
  auth.uid() = id
  OR
  -- Admins can view all profiles
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
  OR
  -- Family members can view each other's profiles (same member_id, both active)
  (
    auth.uid() IS NOT NULL 
    AND member_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.member_id = profiles.member_id
        AND p.is_active = true
        AND profiles.is_active = true
    )
  )
);

-- Drop and recreate the public_profiles view with only non-sensitive data
DROP VIEW IF EXISTS public_profiles;

CREATE VIEW public_profiles AS
SELECT 
  id,
  avatar_url,
  is_active,
  created_at
FROM profiles
WHERE is_active = true;

ALTER VIEW public_profiles SET (security_invoker = true);

COMMENT ON VIEW public_profiles IS 
'Secure public view: only exposes non-sensitive profile data (no names, phones, or member IDs).';

-- Create a secure function for getting user display names
-- This allows controlled access to names only when needed and authorized
CREATE OR REPLACE FUNCTION get_user_display_name(user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  display_name text;
BEGIN
  -- Only return name if requester is:
  -- 1. The user themselves
  -- 2. An admin
  -- 3. A family member (same member_id)
  SELECT full_name INTO display_name
  FROM profiles
  WHERE id = user_id
    AND (
      auth.uid() = id
      OR EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND role = 'admin')
      OR (
        auth.uid() IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid()
            AND p.member_id = profiles.member_id
            AND p.member_id IS NOT NULL
        )
      )
    );
  
  RETURN COALESCE(display_name, 'Usuario');
END;
$$;

COMMENT ON FUNCTION get_user_display_name IS 
'Securely retrieves a user display name with proper access control.';