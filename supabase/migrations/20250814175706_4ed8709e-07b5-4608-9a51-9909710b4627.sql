-- Drop existing policies for interface_preferences
DROP POLICY IF EXISTS "Only admins can view interface preferences" ON interface_preferences;
DROP POLICY IF EXISTS "Only admins can create interface preferences" ON interface_preferences;
DROP POLICY IF EXISTS "Only admins can update interface preferences" ON interface_preferences;
DROP POLICY IF EXISTS "Only admins can delete interface preferences" ON interface_preferences;

-- Create new policies - public read, admin write
CREATE POLICY "Public can view interface preferences"
ON interface_preferences
FOR SELECT
USING (true);

CREATE POLICY "Only admins can create interface preferences"
ON interface_preferences
FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "Only admins can update interface preferences"
ON interface_preferences
FOR UPDATE
USING (is_admin());

CREATE POLICY "Only admins can delete interface preferences"
ON interface_preferences
FOR DELETE
USING (is_admin());