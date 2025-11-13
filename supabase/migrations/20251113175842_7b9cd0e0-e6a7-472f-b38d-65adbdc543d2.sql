-- Asignar todas las reservas especiales sin creador al usuario "Soporte Técnico"
UPDATE public.special_bookings
SET created_by = 'f8961f07-7788-4d6e-ad16-d37ade4a36c9'
WHERE created_by IS NULL;

-- Hacer created_by NOT NULL para futuras inserciones (garantiza trazabilidad)
ALTER TABLE public.special_bookings 
ALTER COLUMN created_by SET NOT NULL;

-- Agregar valor por defecto para created_by usando auth.uid()
ALTER TABLE public.special_bookings 
ALTER COLUMN created_by SET DEFAULT auth.uid();