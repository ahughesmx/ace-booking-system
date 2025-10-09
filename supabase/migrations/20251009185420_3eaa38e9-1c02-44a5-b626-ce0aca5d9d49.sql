-- Fix ERROR 3: Financial Records Accessible to Anyone (receipt_numbers)
-- Remove public SELECT access to receipt numbers table containing sensitive financial data

-- Drop the insecure public policy
DROP POLICY IF EXISTS "Anyone can view receipt numbers" ON public.receipt_numbers;

-- Create restrictive policy: only admins and operators can view receipt numbers for auditing
CREATE POLICY "Only admins and operators can view receipt numbers"
ON public.receipt_numbers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'operador')
  )
);

-- Add documentation
COMMENT ON POLICY "Only admins and operators can view receipt numbers" ON public.receipt_numbers IS 
'Restricts receipt number visibility to admin and operator roles only. Regular users receive receipt numbers via bookings.payment_id field. RPC functions use SECURITY DEFINER and are not affected by this policy.';