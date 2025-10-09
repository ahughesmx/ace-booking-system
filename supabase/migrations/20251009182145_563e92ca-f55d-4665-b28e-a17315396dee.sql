-- Tighten direct access on instructors table to prevent PII harvesting
-- 1) Ensure RLS is enabled (idempotent)
ALTER TABLE public.instructors ENABLE ROW LEVEL SECURITY;

-- 2) Remove any broad grants to anonymous/public
REVOKE ALL ON TABLE public.instructors FROM PUBLIC;
REVOKE ALL ON TABLE public.instructors FROM anon;

-- 3) Ensure only authenticated users can attempt operations (RLS will further restrict)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.instructors TO authenticated;

-- 4) Optional: document intent
COMMENT ON TABLE public.instructors IS 'Contains instructor records including PII. Direct table access restricted via GRANTS + RLS. Use view public.instructor_public_info for public reads.';
