-- Root fix: allow family memberships to reuse the same member_id without last-name coupling
-- Update can_use_member_id to only require the member_id to exist in valid_member_ids
-- and bypass any additional checks. Keep SECURITY DEFINER and stability.

CREATE OR REPLACE FUNCTION public.can_use_member_id(
  p_member_id text,
  p_email text,
  p_full_name text
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  member_exists boolean;
BEGIN
  -- Validate the member_id exists in the authorized list
  SELECT EXISTS (
    SELECT 1 FROM public.valid_member_ids v WHERE v.member_id = p_member_id
  ) INTO member_exists;

  IF NOT member_exists THEN
    RETURN false;
  END IF;

  -- Family memberships: allow multiple profiles for the same member_id
  -- We no longer restrict by last name; the member_id itself is the grouping key
  RETURN true;
END;
$$;