-- Drop ALL existing RLS policies for bookings table to start clean
DROP POLICY IF EXISTS "Users can view own bookings and admins can view all" ON public.bookings;
DROP POLICY IF EXISTS "bookings_update_enhanced" ON public.bookings;
DROP POLICY IF EXISTS "Enable delete for booking owners and admins" ON public.bookings;
DROP POLICY IF EXISTS "bookings_delete_policy" ON public.bookings;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.bookings;
DROP POLICY IF EXISTS "bookings_insert_policy" ON public.bookings;
DROP POLICY IF EXISTS "Family members and admins can view bookings" ON public.bookings;
DROP POLICY IF EXISTS "Family members and admins can update bookings" ON public.bookings;
DROP POLICY IF EXISTS "Family members and admins can delete bookings" ON public.bookings;

-- Create INSERT policy (keep existing functionality)
CREATE POLICY "Authenticated users can create bookings" 
ON public.bookings 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Create new SELECT policy that allows family members to view each other's bookings
CREATE POLICY "Family members and admins can view bookings" 
ON public.bookings 
FOR SELECT 
USING (
  (auth.uid() = user_id) OR 
  (EXISTS (
    SELECT 1 FROM profiles p1, profiles p2 
    WHERE p1.id = auth.uid() 
    AND p2.id = user_id 
    AND p1.member_id = p2.member_id 
    AND p1.member_id IS NOT NULL
  )) OR 
  (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = ANY (ARRAY['admin'::user_role, 'operador'::user_role])
  ))
);

-- Create new UPDATE policy that allows family members to update each other's bookings
CREATE POLICY "Family members and admins can update bookings" 
ON public.bookings 
FOR UPDATE 
USING (
  (auth.uid() = user_id) OR 
  (EXISTS (
    SELECT 1 FROM profiles p1, profiles p2 
    WHERE p1.id = auth.uid() 
    AND p2.id = user_id 
    AND p1.member_id = p2.member_id 
    AND p1.member_id IS NOT NULL
  )) OR 
  (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = ANY (ARRAY['admin'::user_role, 'operador'::user_role])
  ))
);

-- Create new DELETE policy that allows family members to delete each other's bookings
CREATE POLICY "Family members and admins can delete bookings" 
ON public.bookings 
FOR DELETE 
USING (
  (auth.uid() = user_id) OR 
  (EXISTS (
    SELECT 1 FROM profiles p1, profiles p2 
    WHERE p1.id = auth.uid() 
    AND p2.id = user_id 
    AND p1.member_id = p2.member_id 
    AND p1.member_id IS NOT NULL
  )) OR 
  (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = ANY (ARRAY['admin'::user_role, 'operador'::user_role])
  ))
);