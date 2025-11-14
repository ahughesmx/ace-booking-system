-- Crear tabla para logs de verificación de pagos
CREATE TABLE IF NOT EXISTS public.payment_verification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Identificadores
  function_name TEXT NOT NULL, -- 'verify-payment', 'verify-paypal-payment', 'verify-mercadopago-payment'
  session_id TEXT NOT NULL, -- Stripe session_id, PayPal order_id, o MercadoPago payment_id
  booking_id UUID, -- Puede ser NULL si no se encontró
  user_id UUID,
  
  -- Estado y timing
  status TEXT NOT NULL, -- 'success', 'error', 'not_found'
  duration_ms INTEGER, -- Duración de la verificación en milisegundos
  
  -- Detalles
  error_message TEXT,
  payment_status TEXT, -- Estado del pago en la pasarela
  amount DECIMAL(10, 2),
  
  -- Metadata adicional
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Índices para búsqueda rápida
  CONSTRAINT valid_function_name CHECK (function_name IN ('verify-payment', 'verify-paypal-payment', 'verify-mercadopago-payment')),
  CONSTRAINT valid_status CHECK (status IN ('success', 'error', 'not_found', 'duplicate'))
);

-- Crear índices para consultas comunes
CREATE INDEX IF NOT EXISTS idx_payment_logs_created_at ON public.payment_verification_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_logs_function ON public.payment_verification_logs(function_name);
CREATE INDEX IF NOT EXISTS idx_payment_logs_status ON public.payment_verification_logs(status);
CREATE INDEX IF NOT EXISTS idx_payment_logs_session_id ON public.payment_verification_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_booking_id ON public.payment_verification_logs(booking_id);

-- RLS: Solo admins pueden ver logs
ALTER TABLE public.payment_verification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view payment verification logs"
ON public.payment_verification_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Las edge functions escriben con service role, no necesitan policy de INSERT

COMMENT ON TABLE public.payment_verification_logs IS 'Logs de verificación de pagos para monitoreo y debugging';
COMMENT ON COLUMN public.payment_verification_logs.duration_ms IS 'Duración total de la verificación en milisegundos';
COMMENT ON COLUMN public.payment_verification_logs.metadata IS 'Datos adicionales como webhook count, environment, etc.';