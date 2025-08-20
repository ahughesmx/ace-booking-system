-- Fix the security definer view issue by dropping and recreating the instructor_public_info view without SECURITY DEFINER
DROP VIEW IF EXISTS public.instructor_public_info;

-- Recreate the view with proper security (without SECURITY DEFINER)
CREATE VIEW public.instructor_public_info AS
SELECT 
  i.id,
  i.full_name,
  i.bio,
  i.avatar_url,
  i.specialties,
  i.certifications,
  i.experience_years,
  i.is_active,
  i.created_at,
  i.updated_at
FROM public.instructors i
WHERE i.is_active = true;