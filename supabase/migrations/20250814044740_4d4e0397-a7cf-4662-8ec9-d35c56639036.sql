-- Crear tabla para gestionar solicitudes de registro pendientes
CREATE TABLE public.user_registration_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS en la tabla
ALTER TABLE public.user_registration_requests ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para solicitudes de registro
CREATE POLICY "Admins y operadores pueden ver todas las solicitudes" 
ON public.user_registration_requests 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = auth.uid() 
  AND role IN ('admin', 'operador')
));

CREATE POLICY "Admins y operadores pueden actualizar solicitudes" 
ON public.user_registration_requests 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = auth.uid() 
  AND role IN ('admin', 'operador')
));

CREATE POLICY "Sistema puede crear solicitudes" 
ON public.user_registration_requests 
FOR INSERT 
WITH CHECK (true);

-- Crear función para actualizar timestamp
CREATE OR REPLACE FUNCTION public.update_registration_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Trigger para actualizar timestamp automáticamente
CREATE TRIGGER update_registration_requests_updated_at
  BEFORE UPDATE ON public.user_registration_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_registration_requests_updated_at();