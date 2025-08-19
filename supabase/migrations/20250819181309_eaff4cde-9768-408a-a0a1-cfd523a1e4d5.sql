-- Agregar columna updated_at a la tabla profiles
ALTER TABLE public.profiles 
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Crear trigger para actualizar updated_at automáticamente
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();