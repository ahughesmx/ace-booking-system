-- Add audit columns to special_bookings table
ALTER TABLE public.special_bookings 
ADD COLUMN created_by UUID REFERENCES public.profiles(id),
ADD COLUMN updated_by UUID REFERENCES public.profiles(id);

-- Set created_by for existing records (optional, set to NULL if unknown)
-- UPDATE public.special_bookings SET created_by = NULL WHERE created_by IS NULL;

-- Create trigger function to automatically update updated_by
CREATE OR REPLACE FUNCTION public.update_special_booking_updated_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_by = auth.uid();
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create trigger for automatic updated_by tracking
CREATE TRIGGER set_special_booking_updated_by
BEFORE UPDATE ON public.special_bookings
FOR EACH ROW
EXECUTE FUNCTION public.update_special_booking_updated_by();