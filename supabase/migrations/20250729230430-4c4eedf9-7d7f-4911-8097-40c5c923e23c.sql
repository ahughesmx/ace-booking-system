-- Crear tabla para configuración de gestión de partidos
CREATE TABLE public.match_management_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cleanup_hours_after_booking integer NOT NULL DEFAULT 5,
  cleanup_enabled boolean NOT NULL DEFAULT true,
  cleanup_frequency_minutes integer NOT NULL DEFAULT 60,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insertar configuración por defecto
INSERT INTO public.match_management_settings (cleanup_hours_after_booking, cleanup_enabled, cleanup_frequency_minutes)
VALUES (5, true, 60);

-- Habilitar RLS
ALTER TABLE public.match_management_settings ENABLE ROW LEVEL SECURITY;

-- Solo administradores pueden ver y gestionar la configuración
CREATE POLICY "Solo admins pueden ver configuración de partidos" 
ON public.match_management_settings 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Solo admins pueden actualizar configuración de partidos" 
ON public.match_management_settings 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Trigger para actualizar updated_at
CREATE TRIGGER update_match_management_settings_updated_at
  BEFORE UPDATE ON public.match_management_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();