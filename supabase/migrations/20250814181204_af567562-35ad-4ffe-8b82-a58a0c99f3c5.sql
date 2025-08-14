-- Update RLS policies for bookings to ensure proper JOIN access
DROP POLICY IF EXISTS "Enable read access for all users" ON public.bookings;

-- Create a more specific policy for reading bookings with court data
CREATE POLICY "Users can view bookings with court info"
ON public.bookings
FOR SELECT
USING (true);

-- Ensure courts table has proper read access for joins
DROP POLICY IF EXISTS "Enable read for everyone on courts" ON public.courts;
DROP POLICY IF EXISTS "courts_select_policy" ON public.courts;

CREATE POLICY "Public can view courts for joins"
ON public.courts
FOR SELECT
USING (true);