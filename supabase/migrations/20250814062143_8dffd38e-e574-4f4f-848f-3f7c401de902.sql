-- Crear tabla para folios de tickets de cobro
CREATE TABLE public.receipt_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number TEXT UNIQUE NOT NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  year INTEGER NOT NULL,
  sequential_number INTEGER NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.receipt_numbers ENABLE ROW LEVEL SECURITY;

-- Política para que todos puedan ver los folios
CREATE POLICY "Anyone can view receipt numbers" 
ON public.receipt_numbers 
FOR SELECT 
USING (true);

-- Política para que usuarios autenticados puedan crear folios
CREATE POLICY "Authenticated users can create receipt numbers" 
ON public.receipt_numbers 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Función para generar el siguiente folio
CREATE OR REPLACE FUNCTION public.generate_receipt_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_year INTEGER;
  next_sequential INTEGER;
  receipt_number TEXT;
BEGIN
  current_year := EXTRACT(year FROM now());
  
  -- Obtener el siguiente número secuencial para este año
  SELECT COALESCE(MAX(sequential_number), 0) + 1 
  INTO next_sequential
  FROM receipt_numbers 
  WHERE year = current_year;
  
  -- Generar el folio con formato COB-YYYY-NNNNN
  receipt_number := 'COB-' || current_year || '-' || LPAD(next_sequential::TEXT, 5, '0');
  
  RETURN receipt_number;
END;
$$;

-- Función para crear un folio y asociarlo a una reserva
CREATE OR REPLACE FUNCTION public.create_receipt_number(p_booking_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_year INTEGER;
  next_sequential INTEGER;
  receipt_number TEXT;
BEGIN
  current_year := EXTRACT(year FROM now());
  
  -- Obtener el siguiente número secuencial para este año
  SELECT COALESCE(MAX(sequential_number), 0) + 1 
  INTO next_sequential
  FROM receipt_numbers 
  WHERE year = current_year;
  
  -- Generar el folio con formato COB-YYYY-NNNNN
  receipt_number := 'COB-' || current_year || '-' || LPAD(next_sequential::TEXT, 5, '0');
  
  -- Insertar el folio en la tabla
  INSERT INTO receipt_numbers (receipt_number, booking_id, year, sequential_number)
  VALUES (receipt_number, p_booking_id, current_year, next_sequential);
  
  RETURN receipt_number;
END;
$$;