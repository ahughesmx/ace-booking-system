
-- Crear tabla para webhooks
CREATE TABLE public.webhooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  event_type TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  headers JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Añadir trigger para actualizar updated_at
CREATE TRIGGER update_webhooks_updated_at
  BEFORE UPDATE ON public.webhooks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Habilitar Row Level Security (solo admins pueden gestionar webhooks)
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

-- Política para que solo usuarios autenticados puedan ver webhooks
CREATE POLICY "Authenticated users can view webhooks" 
  ON public.webhooks 
  FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Política para que solo usuarios autenticados puedan crear webhooks
CREATE POLICY "Authenticated users can create webhooks" 
  ON public.webhooks 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- Política para que solo usuarios autenticados puedan actualizar webhooks
CREATE POLICY "Authenticated users can update webhooks" 
  ON public.webhooks 
  FOR UPDATE 
  USING (auth.role() = 'authenticated');

-- Política para que solo usuarios autenticados puedan eliminar webhooks
CREATE POLICY "Authenticated users can delete webhooks" 
  ON public.webhooks 
  FOR DELETE 
  USING (auth.role() = 'authenticated');
