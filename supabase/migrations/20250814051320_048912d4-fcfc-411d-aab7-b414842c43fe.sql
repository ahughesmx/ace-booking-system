-- Add special price field for operador role payments to court_type_settings
ALTER TABLE public.court_type_settings 
ADD COLUMN operador_price_per_hour numeric DEFAULT 0.00;

-- Add payment method and actual amount charged to bookings table
ALTER TABLE public.bookings 
ADD COLUMN payment_method text DEFAULT 'online',
ADD COLUMN actual_amount_charged numeric;

-- Update existing bookings to have default payment method
UPDATE public.bookings 
SET payment_method = 'online' 
WHERE payment_method IS NULL;