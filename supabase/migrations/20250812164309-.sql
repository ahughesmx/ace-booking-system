-- Agregar columna para habilitar/deshabilitar cancelaciones
ALTER TABLE public.booking_rules 
ADD COLUMN allow_cancellation boolean NOT NULL DEFAULT true;