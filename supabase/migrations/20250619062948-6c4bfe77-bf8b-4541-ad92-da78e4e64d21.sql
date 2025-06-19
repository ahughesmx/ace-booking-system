
-- Create table for court maintenance periods
CREATE TABLE public.court_maintenance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  court_id UUID REFERENCES public.courts(id) ON DELETE CASCADE NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS on court_maintenance table
ALTER TABLE public.court_maintenance ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing court maintenance (public read)
CREATE POLICY "Anyone can view court maintenance" 
  ON public.court_maintenance 
  FOR SELECT 
  USING (true);

-- Create policy for managing court maintenance (admin only)
CREATE POLICY "Admins can manage court maintenance" 
  ON public.court_maintenance 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_court_maintenance_updated_at
  BEFORE UPDATE ON public.court_maintenance
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create index for better query performance
CREATE INDEX idx_court_maintenance_court_time ON public.court_maintenance(court_id, start_time, end_time) WHERE is_active = true;
CREATE INDEX idx_court_maintenance_active ON public.court_maintenance(is_active, start_time, end_time);
