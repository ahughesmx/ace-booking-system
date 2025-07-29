-- Create table for available court types
CREATE TABLE public.available_court_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type_name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.available_court_types ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view available court types" 
ON public.available_court_types 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can manage available court types" 
ON public.available_court_types 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'admin'::user_role
));

-- Insert default court types
INSERT INTO public.available_court_types (type_name, display_name, is_enabled) VALUES
('tennis', 'Tenis', true),
('padel', 'Pádel', true),
('football', 'Fútbol', false);

-- Create trigger for updated_at
CREATE TRIGGER update_available_court_types_updated_at
BEFORE UPDATE ON public.available_court_types
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();