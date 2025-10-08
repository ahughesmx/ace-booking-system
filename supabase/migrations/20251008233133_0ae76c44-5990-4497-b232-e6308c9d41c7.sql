-- =====================================================
-- MIGRACIÓN: Cierre Imprevisto de Canchas
-- =====================================================
-- Esta migración añade soporte para cierres imprevistos de canchas
-- con notificación automática a usuarios con reservas afectadas

-- 1. Añadir columnas a court_maintenance para cierres imprevistos
ALTER TABLE public.court_maintenance
ADD COLUMN IF NOT EXISTS is_emergency boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS expected_reopening timestamp with time zone,
ADD COLUMN IF NOT EXISTS all_courts boolean DEFAULT false;

COMMENT ON COLUMN public.court_maintenance.is_emergency IS 
'Indica si este mantenimiento es un cierre imprevisto (emergencia)';

COMMENT ON COLUMN public.court_maintenance.expected_reopening IS 
'Fecha probable de reapertura de la cancha (para cierres imprevistos)';

COMMENT ON COLUMN public.court_maintenance.all_courts IS 
'Indica si el cierre aplica a todas las canchas (cierre general)';

-- 2. Crear tabla para trackear reservas afectadas por cierres imprevistos
CREATE TABLE IF NOT EXISTS public.affected_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  maintenance_id uuid NOT NULL REFERENCES public.court_maintenance(id) ON DELETE CASCADE,
  user_notified boolean DEFAULT false,
  notified_at timestamp with time zone,
  can_reschedule boolean DEFAULT true,
  rescheduled boolean DEFAULT false,
  rescheduled_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(booking_id, maintenance_id)
);

COMMENT ON TABLE public.affected_bookings IS 
'Rastrea las reservas afectadas por cierres imprevistos y su estado de reagendamiento';

-- 3. Habilitar RLS en affected_bookings
ALTER TABLE public.affected_bookings ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS para affected_bookings
CREATE POLICY "Usuarios pueden ver sus propias reservas afectadas"
ON public.affected_bookings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bookings
    WHERE bookings.id = affected_bookings.booking_id
      AND bookings.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Sistema puede insertar reservas afectadas"
ON public.affected_bookings
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins y sistema pueden actualizar reservas afectadas"
ON public.affected_bookings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1 FROM public.bookings
    WHERE bookings.id = affected_bookings.booking_id
      AND bookings.user_id = auth.uid()
  )
);

-- 5. Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_affected_bookings_booking_id 
ON public.affected_bookings(booking_id);

CREATE INDEX IF NOT EXISTS idx_affected_bookings_maintenance_id 
ON public.affected_bookings(maintenance_id);

CREATE INDEX IF NOT EXISTS idx_affected_bookings_can_reschedule 
ON public.affected_bookings(can_reschedule) 
WHERE can_reschedule = true;

CREATE INDEX IF NOT EXISTS idx_court_maintenance_emergency 
ON public.court_maintenance(is_emergency) 
WHERE is_emergency = true;

-- 6. Función para actualizar updated_at en affected_bookings
CREATE OR REPLACE FUNCTION update_affected_bookings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 7. Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_affected_bookings_updated_at ON public.affected_bookings;
CREATE TRIGGER trigger_update_affected_bookings_updated_at
  BEFORE UPDATE ON public.affected_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_affected_bookings_updated_at();