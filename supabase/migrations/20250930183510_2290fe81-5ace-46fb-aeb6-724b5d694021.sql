-- ============================================
-- SECURITY FIX: Remove Plaintext Password Storage
-- ============================================

-- Drop the password column from user_registration_requests
-- Passwords should NEVER be stored in plaintext, even temporarily
ALTER TABLE user_registration_requests 
DROP COLUMN IF EXISTS password CASCADE;

-- Drop the password_provided column as it's no longer needed
ALTER TABLE user_registration_requests 
DROP COLUMN IF EXISTS password_provided CASCADE;

-- Add a column to indicate if user should set their own password
-- This is safe because it doesn't contain the actual password
ALTER TABLE user_registration_requests 
ADD COLUMN IF NOT EXISTS send_password_reset BOOLEAN DEFAULT true;

COMMENT ON COLUMN user_registration_requests.send_password_reset IS 
'If true, user will receive a password reset email to set their own password. If false, operator will provide password directly during approval (never stored in database).';