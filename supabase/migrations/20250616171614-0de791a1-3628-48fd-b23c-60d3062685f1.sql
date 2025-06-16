
-- Agregar columna court_type a la tabla courts
ALTER TABLE public.courts 
ADD COLUMN court_type TEXT NOT NULL DEFAULT 'tennis' 
CHECK (court_type IN ('tennis', 'padel'));

-- Actualizar la cancha existente para que sea de pádel (asumiendo que es la primera)
UPDATE public.courts 
SET court_type = 'padel' 
WHERE id = (SELECT id FROM public.courts ORDER BY created_at ASC LIMIT 1);

-- Insertar las 4 canchas de tenis
INSERT INTO public.courts (name, court_type) VALUES
('Cancha Tenis 1', 'tennis'),
('Cancha Tenis 2', 'tennis'),
('Cancha Tenis 3', 'tennis'),
('Cancha Tenis 4', 'tennis');
