-- Add password column to user_registration_requests table
ALTER TABLE public.user_registration_requests 
ADD COLUMN password text;