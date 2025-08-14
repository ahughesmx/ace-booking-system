-- Add missing foreign key between bookings and courts
ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_court_id_fkey 
FOREIGN KEY (court_id) REFERENCES public.courts(id);

-- Add missing foreign key between bookings and profiles (user_id)
ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id);