
-- Primero eliminar todas las reservas existentes
DELETE FROM public.bookings;

-- Luego eliminar todas las canchas existentes
DELETE FROM public.courts;

-- Insertar las canchas correctas
INSERT INTO public.courts (name, court_type) VALUES
('Cancha 1', 'padel'),
('Cancha 1', 'tennis'),
('Cancha 2', 'tennis'),
('Cancha 3', 'tennis'),
('Cancha 4', 'tennis');
