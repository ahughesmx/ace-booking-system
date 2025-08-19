-- Agregar política de INSERT para la tabla profiles
-- Permitir a admins y operadores insertar perfiles de usuario durante el proceso de aprobación
CREATE POLICY "Admins can insert profiles during registration approval" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM user_roles 
    WHERE user_id = auth.uid() 
      AND role IN ('admin', 'operador')
  )
);