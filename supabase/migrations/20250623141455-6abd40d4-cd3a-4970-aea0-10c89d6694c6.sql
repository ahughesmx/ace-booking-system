
-- Create the special_bookings table
CREATE TABLE public.special_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  court_id UUID REFERENCES public.courts(id) NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('torneo', 'clases', 'eventos')),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  price_type TEXT NOT NULL DEFAULT 'normal' CHECK (price_type IN ('normal', 'custom')),
  custom_price NUMERIC,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_pattern TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.special_bookings ENABLE ROW LEVEL SECURITY;

-- Create policies for special_bookings (admin only access)
CREATE POLICY "Only admins can view special bookings" 
  ON public.special_bookings 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can create special bookings" 
  ON public.special_bookings 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can update special bookings" 
  ON public.special_bookings 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete special bookings" 
  ON public.special_bookings 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.special_bookings 
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
