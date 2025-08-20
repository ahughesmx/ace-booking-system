-- Add processed_by column to bookings table to track who processed the payment
ALTER TABLE public.bookings 
ADD COLUMN processed_by uuid REFERENCES public.profiles(id);

-- Add comment to document the purpose
COMMENT ON COLUMN public.bookings.processed_by IS 'User ID of the operator who processed this booking payment (for cash payments)';

-- Create index for better query performance
CREATE INDEX idx_bookings_processed_by ON public.bookings(processed_by);