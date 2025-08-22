-- Add rules acceptance timestamp to bookings table
ALTER TABLE bookings ADD COLUMN rules_accepted_at timestamp with time zone;