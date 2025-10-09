-- Fix ERROR 2: Payment Information Could Be Accessed by Unauthorized Users
-- Remove the overly permissive clause that allows ANY authenticated user to view ALL paid bookings

-- Drop the problematic policy
DROP POLICY IF EXISTS "Authenticated users can view all bookings basic info" ON public.bookings;

-- Recreate the policy WITHOUT the insecure clause ((status = 'paid') AND (auth.uid() IS NOT NULL))
CREATE POLICY "Users can view bookings based on ownership and roles"
ON public.bookings
FOR SELECT
USING (
  -- User owns the booking
  (auth.uid() = user_id) 
  OR 
  -- Family member (same member_id)
  (EXISTS (
    SELECT 1 
    FROM profiles p1, profiles p2 
    WHERE p1.id = auth.uid() 
      AND p2.id = bookings.user_id 
      AND p1.member_id = p2.member_id 
      AND p1.member_id IS NOT NULL
  )) 
  OR 
  -- Admin or operator role
  (EXISTS (
    SELECT 1 
    FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
      AND role IN ('admin', 'operador')
  ))
);

-- Add documentation
COMMENT ON POLICY "Users can view bookings based on ownership and roles" ON public.bookings IS 
'Restricts booking visibility to: (1) booking owner, (2) family members sharing member_id, (3) admin/operator roles. Prevents unauthorized access to payment information.';
