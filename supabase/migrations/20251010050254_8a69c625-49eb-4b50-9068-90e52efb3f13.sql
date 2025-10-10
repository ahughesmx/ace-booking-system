-- Security hardening for instructor contact exposure
-- 1) Ensure RLS is enabled on instructors (idempotent if already enabled)
ALTER TABLE public.instructors ENABLE ROW LEVEL SECURITY;

-- 2) Drop existing view and recreate with correct column order and SECURITY INVOKER
DROP VIEW IF EXISTS public.instructor_public_info;

CREATE VIEW public.instructor_public_info
WITH (security_invoker = on) AS
SELECT
  i.id,
  i.full_name,
  i.bio,
  i.experience_years,
  i.specialties,
  i.certifications,
  i.avatar_url,
  i.is_active,
  i.created_at,
  i.updated_at
FROM public.instructors i
WHERE i.is_active = true;

COMMENT ON VIEW public.instructor_public_info IS 'Public-safe instructor info. Does NOT include email or phone. SECURITY INVOKER so RLS on instructors applies to the querying user.';

-- 3) Make the view readable by web clients (safe because it excludes PII)
GRANT SELECT ON public.instructor_public_info TO anon, authenticated;