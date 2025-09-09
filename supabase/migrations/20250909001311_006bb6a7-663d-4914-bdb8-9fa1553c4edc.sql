-- Create table for booking reminder settings
CREATE TABLE public.booking_reminder_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hours_before_booking INTEGER NOT NULL DEFAULT 2,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.booking_reminder_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Only admins can manage booking reminder settings" 
ON public.booking_reminder_settings 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Insert default settings
INSERT INTO public.booking_reminder_settings (hours_before_booking, is_enabled)
VALUES (2, true);

-- Create trigger for updated_at
CREATE TRIGGER update_booking_reminder_settings_updated_at
BEFORE UPDATE ON public.booking_reminder_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();