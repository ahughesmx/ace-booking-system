-- Aprobar manualmente a Rodrigo Baldomar
-- Primero buscar su solicitud
UPDATE public.user_registration_requests 
SET 
  status = 'approved',
  processed_at = now(),
  processed_by = 'de03fd7a-0554-4dc8-bbd2-b98e848d0b0e'
WHERE full_name ILIKE '%Rodrigo%' AND status = 'pending';