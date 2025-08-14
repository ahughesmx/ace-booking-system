-- Disable RLS temporarily to see if that's the issue, then re-enable with correct policies
ALTER TABLE public.valid_member_ids DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE public.valid_member_ids ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Public can view valid member IDs for registration" ON public.valid_member_ids;
DROP POLICY IF EXISTS "Only admins can insert valid member IDs" ON public.valid_member_ids;
DROP POLICY IF EXISTS "Only admins can update valid member IDs" ON public.valid_member_ids;
DROP POLICY IF EXISTS "Only admins can delete valid member IDs" ON public.valid_member_ids;
DROP POLICY IF EXISTS "Authenticated users can view valid member IDs" ON public.valid_member_ids;

-- Create a simple, permissive read policy for everyone
CREATE POLICY "Allow all read access to valid member IDs"
ON public.valid_member_ids
FOR SELECT
TO public
USING (true);

-- Create admin-only write policies
CREATE POLICY "Admins only can write valid member IDs"
ON public.valid_member_ids
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());