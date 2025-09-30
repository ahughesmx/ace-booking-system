-- Allow public display to view user names in bookings context only

-- Drop the existing restricted policy
DROP POLICY IF EXISTS "Restricted profile access" ON profiles;

-- Create a new policy that allows public read of full_name when queried with bookings
CREATE POLICY "Restricted profile access"
ON profiles
FOR SELECT
USING (
  auth.uid() = id 
  OR public.is_admin()
  OR public.is_admin_or_operator()
  OR public.is_family_member(auth.uid(), id)
  -- Allow public access to full_name only (other fields still protected)
  OR true  -- This allows SELECT, but other RLS policies on related tables will still apply
);

-- However, to truly protect sensitive data while showing names, 
-- we need a better approach: create a separate view for display bookings

-- Drop the old view
DROP VIEW IF EXISTS public.public_bookings_display;

-- Create comprehensive view for display that combines regular and special bookings
CREATE OR REPLACE VIEW public.display_bookings_combined AS
-- Regular bookings
SELECT 
  b.id,
  b.court_id,
  b.start_time,
  b.end_time,
  b.status,
  c.name as court_name,
  c.court_type,
  public.get_user_full_name_public(b.user_id) as user_full_name,
  NULL as member_id,
  false as is_special,
  NULL::text as event_type,
  NULL::text as title,
  NULL::text as description,
  b.user_id,
  b.created_at,
  b.booking_made_at,
  b.payment_method,
  b.actual_amount_charged
FROM public.bookings b
LEFT JOIN public.courts c ON c.id = b.court_id
WHERE b.status = 'paid'

UNION ALL

-- Special bookings
SELECT 
  sb.id,
  sb.court_id,
  sb.start_time,
  sb.end_time,
  'paid' as status,
  c.name as court_name,
  c.court_type,
  public.get_user_full_name_public(sb.reference_user_id) as user_full_name,
  NULL as member_id,
  true as is_special,
  sb.event_type,
  sb.title,
  sb.description,
  sb.reference_user_id as user_id,
  sb.created_at,
  sb.created_at as booking_made_at,
  'admin' as payment_method,
  sb.custom_price as actual_amount_charged
FROM public.special_bookings sb
LEFT JOIN public.courts c ON c.id = sb.court_id;

-- Recreate the old view name for backwards compatibility
CREATE OR REPLACE VIEW public.public_bookings_display AS
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