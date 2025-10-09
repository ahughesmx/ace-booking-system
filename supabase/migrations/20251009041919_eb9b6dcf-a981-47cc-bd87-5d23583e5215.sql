
-- Recreate the instructor_public_info view to ensure it only exposes non-PII data
DROP VIEW IF EXISTS public.instructor_public_info CASCADE;

CREATE VIEW public.instructor_public_info AS
SELECT 
  id,
  full_name,
  bio,
  specialties,
  certifications,
  experience_years,
  avatar_url,
  is_active,
  created_at,
  updated_at
FROM public.instructors
WHERE is_active = true;

-- Grant access to authenticated users
GRANT SELECT ON public.instructor_public_info TO authenticated;
GRANT SELECT ON public.instructor_public_info TO anon;

-- Add comment explaining the view's purpose
COMMENT ON VIEW public.instructor_public_info IS 'Public view of instructor data that excludes PII (email, phone, user_id) to prevent data harvesting. Use this view for public-facing instructor listings.';
