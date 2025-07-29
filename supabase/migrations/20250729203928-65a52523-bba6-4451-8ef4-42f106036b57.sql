-- Crear tabla para configuración de pagos
CREATE TABLE public.payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_timeout_minutes INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insertar configuración inicial
INSERT INTO public.payment_settings (payment_timeout_minutes) VALUES (10);

-- Crear tabla para configuración de pasarelas de pago
CREATE TABLE public.payment_gateways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  test_mode BOOLEAN NOT NULL DEFAULT true,
  configuration JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(name)
);

-- Insertar configuraciones iniciales de pasarelas
INSERT INTO public.payment_gateways (name, enabled, test_mode, configuration) VALUES 
('stripe', false, true, '{
  "publishableKeyTest": "",
  "secretKeyTest": "",
  "publishableKeyLive": "",
  "secretKeyLive": "",
  "webhookEndpointTest": "",
  "webhookEndpointLive": "",
  "webhookSecretTest": "",
  "webhookSecretLive": ""
}'),
('paypal', false, true, '{
  "clientIdTest": "",
  "clientSecretTest": "",
  "clientIdLive": "",
  "clientSecretLive": "",
  "webhookId": "",
  "sandboxAccount": ""
}');

-- Agregar columnas de estado y pago a la tabla bookings
ALTER TABLE public.bookings 
ADD COLUMN status TEXT NOT NULL DEFAULT 'pending_payment',
ADD COLUMN amount NUMERIC(10,2),
ADD COLUMN currency TEXT DEFAULT 'USD',
ADD COLUMN payment_id TEXT,
ADD COLUMN payment_gateway TEXT,
ADD COLUMN payment_completed_at TIMESTAMPTZ,
ADD COLUMN expires_at TIMESTAMPTZ;

-- Crear índices para mejorar performance
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_bookings_expires_at ON public.bookings(expires_at);
CREATE INDEX idx_bookings_payment_id ON public.bookings(payment_id);

-- Función para calcular fecha de expiración
CREATE OR REPLACE FUNCTION calculate_booking_expiration(booking_time TIMESTAMPTZ)
RETURNS TIMESTAMPTZ
LANGUAGE SQL
STABLE
AS $$
  SELECT booking_time + (
    SELECT INTERVAL '1 minute' * payment_timeout_minutes 
    FROM payment_settings 
    LIMIT 1
  )
$$;

-- Trigger para establecer fecha de expiración automáticamente
CREATE OR REPLACE FUNCTION set_booking_expiration()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'pending_payment' AND NEW.expires_at IS NULL THEN
    NEW.expires_at := calculate_booking_expiration(NOW());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_booking_expiration_trigger
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION set_booking_expiration();

-- Función para liberar reservas expiradas
CREATE OR REPLACE FUNCTION cleanup_expired_bookings()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Eliminar reservas que han expirado y no han sido pagadas
  DELETE FROM public.bookings 
  WHERE status = 'pending_payment' 
    AND expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- Actualizar bookings existentes para que tengan estado 'paid'
UPDATE public.bookings SET status = 'paid' WHERE status IS NULL OR status = '';

-- Habilitar RLS en las nuevas tablas
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para payment_settings
CREATE POLICY "Todos pueden ver configuración de pagos" 
ON public.payment_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Solo admins pueden actualizar configuración de pagos" 
ON public.payment_settings 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'::user_role
));

-- Políticas RLS para payment_gateways
CREATE POLICY "Todos pueden ver pasarelas de pago" 
ON public.payment_gateways 
FOR SELECT 
USING (true);

CREATE POLICY "Solo admins pueden gestionar pasarelas de pago" 
ON public.payment_gateways 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'::user_role
));

-- Trigger para updated_at
CREATE TRIGGER update_payment_settings_updated_at
  BEFORE UPDATE ON public.payment_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_payment_gateways_updated_at
  BEFORE UPDATE ON public.payment_gateways
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();