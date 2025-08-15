-- Arreglar políticas RLS para payment_gateways para permitir acceso a usuarios autenticados
-- Las políticas actuales solo permiten acceso a admins, pero los usuarios normales necesitan ver las pasarelas habilitadas

-- Eliminar política restrictiva actual
DROP POLICY IF EXISTS "Solo admins pueden ver pasarelas de pago" ON public.payment_gateways;

-- Crear nueva política que permita a usuarios autenticados ver pasarelas habilitadas
CREATE POLICY "Users can view enabled payment gateways" 
ON public.payment_gateways 
FOR SELECT 
TO authenticated
USING (enabled = true);

-- Mantener política de administración solo para admins
CREATE POLICY "Only admins can manage payment gateways" 
ON public.payment_gateways 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'
));