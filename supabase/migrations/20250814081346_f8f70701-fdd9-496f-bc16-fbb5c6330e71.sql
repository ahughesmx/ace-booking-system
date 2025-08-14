-- Crear tabla para preferencias de interfaz
CREATE TABLE public.interface_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_key TEXT NOT NULL UNIQUE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'menu' o 'home_cards'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.interface_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies - solo admins pueden gestionar estas preferencias
CREATE POLICY "Only admins can view interface preferences" 
ON public.interface_preferences 
FOR SELECT 
USING (public.is_admin());

CREATE POLICY "Only admins can create interface preferences" 
ON public.interface_preferences 
FOR INSERT 
WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update interface preferences" 
ON public.interface_preferences 
FOR UPDATE 
USING (public.is_admin());

CREATE POLICY "Only admins can delete interface preferences" 
ON public.interface_preferences 
FOR DELETE 
USING (public.is_admin());

-- Insertar las preferencias por defecto
INSERT INTO public.interface_preferences (feature_key, display_name, description, category) VALUES
('menu_matches', 'Partidos', 'Mostrar opción de Partidos en el menú', 'menu'),
('menu_courses', 'Cursos', 'Mostrar opción de Cursos en el menú', 'menu'),
('menu_ranking', 'Ranking', 'Mostrar opción de Ranking en el menú', 'menu'),
('home_card_matches', 'Registra un partido', 'Mostrar card de "Registra un partido" en el home', 'home_cards'),
('home_card_courses', 'Clases y cursos', 'Mostrar card de "Clases y cursos" en el home', 'home_cards'),
('home_card_competitions', 'Competencias', 'Mostrar card de "Competencias" en el home', 'home_cards');

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_interface_preferences_updated_at
BEFORE UPDATE ON public.interface_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();