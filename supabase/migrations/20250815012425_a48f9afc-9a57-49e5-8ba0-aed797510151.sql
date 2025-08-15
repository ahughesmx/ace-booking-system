-- Fix security issue: Restrict payment_gateways table access to admins only
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Todos pueden ver pasarelas de pago" ON public.payment_gateways;
DROP POLICY IF EXISTS "Solo admins pueden gestionar pasarelas de pago" ON public.payment_gateways;

-- Create secure policies that only allow admin access
CREATE POLICY "Solo admins pueden ver pasarelas de pago" ON public.payment_gateways
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() 
  AND role = 'admin'
));

CREATE POLICY "Solo admins pueden gestionar pasarelas de pago" ON public.payment_gateways
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() 
  AND role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() 
  AND role = 'admin'
));