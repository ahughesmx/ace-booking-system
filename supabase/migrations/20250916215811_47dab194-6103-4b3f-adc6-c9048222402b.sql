-- Add is_migration field to user_registration_requests table
ALTER TABLE public.user_registration_requests 
ADD COLUMN is_migration boolean NOT NULL DEFAULT false;

-- Add index for better performance when filtering by migration status
CREATE INDEX idx_user_registration_requests_is_migration 
ON public.user_registration_requests(is_migration);