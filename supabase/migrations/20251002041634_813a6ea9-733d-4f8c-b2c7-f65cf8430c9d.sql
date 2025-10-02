-- Add password column to user_registration_requests table
-- This stores the temporary password until the request is approved
ALTER TABLE public.user_registration_requests 
ADD COLUMN IF NOT EXISTS password TEXT;

-- Add comment explaining the security model
COMMENT ON COLUMN public.user_registration_requests.password IS 
'Temporary password storage until user is created in auth.users. Cleared after approval.';