-- Add minimum advance booking time parameter to booking_rules table
ALTER TABLE public.booking_rules 
ADD COLUMN min_advance_booking_time interval NOT NULL DEFAULT '02:00:00'::interval;