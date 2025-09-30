-- Grant public read access to the display view

-- First, ensure RLS is NOT enabled on views (views don't have RLS by default, but let's be explicit)
-- Views use the security context of the underlying function/query

-- Grant SELECT permission to authenticated and anon roles on the view
GRANT SELECT ON public.display_bookings_combined TO authenticated, anon;
GRANT SELECT ON public.public_bookings_display TO authenticated, anon;