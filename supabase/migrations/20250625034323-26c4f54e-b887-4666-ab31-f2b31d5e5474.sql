
-- Allow public access to special_bookings for display purposes
DROP POLICY IF EXISTS "Only admins can view special bookings" ON public.special_bookings;

CREATE POLICY "Public can view special bookings" 
  ON public.special_bookings 
  FOR SELECT 
  USING (true);
