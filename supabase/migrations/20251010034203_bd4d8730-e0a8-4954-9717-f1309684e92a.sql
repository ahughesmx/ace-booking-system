-- ============================================
-- SECURITY FIX: Restrict bookings table access to protect payment information
-- ============================================
-- This migration addresses the security issue: "Payment Information Visible to All Members"
-- 
-- The bookings table contains sensitive payment data (payment_id, payment_gateway, 
-- actual_amount_charged, payment_method) that should NOT be visible to all authenticated users.
--
-- Changes:
-- 1. Drop the overly permissive policy "Authenticated users can view all bookings for transparency"
-- 2. Create a new restrictive SELECT policy that only allows:
--    - Booking owner (user_id match)
--    - Family members (same member_id via is_family_member function)
--    - Admins, Operators, and SUPERVISORS (via user_roles)
-- 3. Recreate display_bookings_combined view to explicitly exclude payment fields
-- 4. Recreate dependent view public_bookings_display
-- 5. Add security documentation comments
--
-- This maintains current functionality:
-- - Public display and calendar views use display_bookings_combined (no payment data)
-- - Authenticated users see only their own/family bookings with payment info
-- - Staff (admin/operator/supervisor) can see all bookings with payment info for management

-- Step 1: Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view all bookings for transparency" ON public.bookings;

-- Step 2: Create new restrictive SELECT policy including supervisor
CREATE POLICY "bookings_select_restricted"
ON public.bookings
FOR SELECT
TO authenticated
USING (
  -- Owner can see their own bookings
  auth.uid() = user_id
  OR
  -- Family members can see each other's bookings
  is_family_member(auth.uid(), user_id)
  OR
  -- Admins, operators, and SUPERVISORS can see all bookings
  EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
      AND role IN ('admin', 'operador', 'supervisor')
  )
);

-- Step 3: Drop views with CASCADE to handle dependencies
DROP VIEW IF EXISTS public.display_bookings_combined CASCADE;

-- Step 4: Recreate display_bookings_combined view WITHOUT payment fields
-- This view is used for public display and calendar views where payment info should NOT be visible
CREATE VIEW public.display_bookings_combined AS
-- Regular bookings (excluding payment fields)
SELECT 
  b.id,
  b.court_id,
  b.user_id,
  b.start_time,
  b.end_time,
  b.created_at,
  b.booking_made_at,
  -- Excluded: payment_id, payment_gateway, payment_method, actual_amount_charged
  b.status,
  c.name as court_name,
  c.court_type,
  p.full_name as user_full_name,
  p.member_id,
  false as is_special,
  NULL::text as event_type,
  NULL::text as title,
  NULL::text as description
FROM public.bookings b
LEFT JOIN public.courts c ON b.court_id = c.id
LEFT JOIN public.profiles p ON b.user_id = p.id
WHERE b.status = 'paid'

UNION ALL

-- Special bookings (no payment data in this table)
SELECT 
  sb.id,
  sb.court_id,
  sb.reference_user_id as user_id,
  sb.start_time,
  sb.end_time,
  sb.created_at,
  sb.created_at as booking_made_at,
  'paid'::text as status,
  c.name as court_name,
  c.court_type,
  p.full_name as user_full_name,
  p.member_id,
  true as is_special,
  sb.event_type,
  sb.title,
  sb.description
FROM public.special_bookings sb
LEFT JOIN public.courts c ON sb.court_id = c.id
LEFT JOIN public.profiles p ON sb.reference_user_id = p.id;

-- Step 5: Recreate public_bookings_display view (was dropped by CASCADE)
CREATE VIEW public.public_bookings_display AS
SELECT 
  id,
  court_id,
  start_time,
  end_time,
  status,
  court_name,
  court_type,
  user_full_name as user_display_name
FROM public.display_bookings_combined
WHERE is_special = false;

-- Step 6: Grant access to views for both authenticated and anonymous users
GRANT SELECT ON public.display_bookings_combined TO authenticated;
GRANT SELECT ON public.display_bookings_combined TO anon;
GRANT SELECT ON public.public_bookings_display TO authenticated;
GRANT SELECT ON public.public_bookings_display TO anon;

-- Step 7: Add security documentation
COMMENT ON POLICY "bookings_select_restricted" ON public.bookings IS
'SECURITY: Restricts SELECT access to bookings table to prevent unauthorized access to payment information.
Only allows: booking owner, family members, admins, operators, and supervisors.
For public/calendar displays, use display_bookings_combined view instead.';

COMMENT ON VIEW public.display_bookings_combined IS
'SECURITY: Public-safe view of bookings that EXCLUDES sensitive payment fields.
Use this view for: calendar displays, public booking lists, and general booking information.
Payment details (payment_id, payment_gateway, actual_amount_charged, payment_method) are intentionally excluded.
For full booking details with payment info, query the bookings table directly (RLS enforced).';

COMMENT ON VIEW public.public_bookings_display IS
'SECURITY: Simplified public view of regular bookings (excludes special bookings).
Derived from display_bookings_combined, this view is safe for public display screens.
Does not contain payment information or special event details.';

COMMENT ON TABLE public.bookings IS
'SECURITY: Contains sensitive payment information. Direct SELECT access is restricted via RLS.
Payment fields: payment_id, payment_gateway, actual_amount_charged, payment_method, currency.
Only accessible to: booking owner, family members, admins, operators, and supervisors.
For non-privileged users or public displays, use display_bookings_combined view.';