
-- Add reference_user_id column to special_bookings table
ALTER TABLE public.special_bookings 
ADD COLUMN reference_user_id uuid REFERENCES public.profiles(id);

-- Update existing records to have a reference_user_id (set to first admin user or null for now)
UPDATE public.special_bookings 
SET reference_user_id = (
  SELECT p.id 
  FROM public.profiles p 
  JOIN public.user_roles ur ON p.id = ur.user_id 
  WHERE ur.role = 'admin' 
  LIMIT 1
) 
WHERE reference_user_id IS NULL;
