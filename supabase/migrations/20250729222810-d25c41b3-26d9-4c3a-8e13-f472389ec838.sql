-- Añadir política RLS para permitir que todos los usuarios autenticados puedan leer la configuración de tipos de cancha
CREATE POLICY "Authenticated users can view court type settings" 
ON public.court_type_settings 
FOR SELECT 
TO authenticated
USING (true);