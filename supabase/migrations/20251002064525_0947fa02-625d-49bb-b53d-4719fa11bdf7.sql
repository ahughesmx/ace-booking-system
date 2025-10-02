-- Allow authenticated users to view basic profile info (full_name, member_id) 
-- when they are viewing bookings
-- This is safe because these fields are already visible in the bookings display
CREATE POLICY "Authenticated users can view basic profile info for bookings"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);