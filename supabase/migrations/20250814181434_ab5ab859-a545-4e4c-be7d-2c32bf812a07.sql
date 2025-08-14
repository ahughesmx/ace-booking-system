-- Fix RLS policies for valid_member_ids to allow public read access during registration
DROP POLICY IF EXISTS "Authenticated users can view valid member IDs" ON public.valid_member_ids;

-- Create new policy allowing public read access for registration validation
CREATE POLICY "Public can view valid member IDs for registration"
ON public.valid_member_ids
FOR SELECT
USING (true);

-- Ensure the admin policies remain intact for write operations
-- (They should already exist but let's make sure)
DROP POLICY IF EXISTS "Only admins can insert valid member IDs" ON public.valid_member_ids;
DROP POLICY IF EXISTS "Only admins can update valid member IDs" ON public.valid_member_ids;
DROP POLICY IF EXISTS "Only admins can delete valid member IDs" ON public.valid_member_ids;

CREATE POLICY "Only admins can insert valid member IDs"
ON public.valid_member_ids
FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "Only admins can update valid member IDs"
ON public.valid_member_ids
FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Only admins can delete valid member IDs"
ON public.valid_member_ids
FOR DELETE
USING (is_admin());