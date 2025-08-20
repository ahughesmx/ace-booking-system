-- Allow public read access for display functionality

-- Display settings: Allow public read access
DROP POLICY IF EXISTS "Public can view display settings for display page" ON display_settings;
CREATE POLICY "Public can view display settings for display page" 
ON display_settings 
FOR SELECT 
USING (true);

-- Bookings: Allow public read access for display
DROP POLICY IF EXISTS "Public can view bookings for display" ON bookings;
CREATE POLICY "Public can view bookings for display" 
ON bookings 
FOR SELECT 
USING (true);

-- Courts: Allow public read access for display (already exists as "Public can view courts for joins")
-- This policy already exists and allows public access

-- Available court types: Allow public read access (already exists as "Anyone can view available court types")
-- This policy already exists and allows public access

-- Court type settings: Allow public read access (already exists as "Authenticated users can view court type settings")
-- Need to update this to allow public access
DROP POLICY IF EXISTS "Public can view court type settings for display" ON court_type_settings;
CREATE POLICY "Public can view court type settings for display" 
ON court_type_settings 
FOR SELECT 
USING (true);

-- Special bookings: Allow public read access for display
DROP POLICY IF EXISTS "Public can view special bookings for display" ON special_bookings;
CREATE POLICY "Public can view special bookings for display" 
ON special_bookings 
FOR SELECT 
USING (true);

-- Profiles: Allow public read access for display to show booking user names
DROP POLICY IF EXISTS "Public can view profiles for display" ON profiles;
CREATE POLICY "Public can view profiles for display" 
ON profiles 
FOR SELECT 
USING (full_name IS NOT NULL AND full_name <> '');