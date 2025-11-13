-- Actualizar vista para manejar actual_amount_charged NULL usando COALESCE
DROP VIEW IF EXISTS public.combined_bookings_for_reports CASCADE;

CREATE OR REPLACE VIEW public.combined_bookings_for_reports AS
SELECT 
  b.id,
  b.start_time,
  b.end_time,
  -- Usar COALESCE para tomar amount si actual_amount_charged es NULL
  COALESCE(b.actual_amount_charged, b.amount, 0) as amount,
  b.payment_method,
  b.booking_made_at as payment_completed_at,
  b.status,
  b.user_id,
  b.court_id,
  b.processed_by,
  'regular' as booking_type,
  null::text as title,
  null::text as event_type,
  -- Datos del usuario
  p.full_name as user_full_name,
  p.member_id as user_member_id,
  -- Datos de la cancha
  c.name as court_name,
  c.court_type as court_type,
  -- Datos del procesador
  pp.full_name as processed_by_name
FROM public.bookings b
LEFT JOIN public.profiles p ON b.user_id = p.id
LEFT JOIN public.courts c ON b.court_id = c.id
LEFT JOIN public.profiles pp ON b.processed_by = pp.id
WHERE b.status IN ('paid', 'cancelled')

UNION ALL

SELECT
  sb.id,
  sb.start_time,
  sb.end_time,
  calculate_special_booking_price(
    sb.price_type,
    sb.custom_price,
    sb.court_id,
    sb.start_time,
    sb.end_time
  ) as amount,
  sb.payment_method,
  sb.payment_completed_at,
  sb.status,
  sb.reference_user_id as user_id,
  sb.court_id,
  sb.processed_by,
  'special' as booking_type,
  sb.title,
  sb.event_type,
  -- Datos del usuario de referencia
  p.full_name as user_full_name,
  p.member_id as user_member_id,
  -- Datos de la cancha
  c.name as court_name,
  c.court_type as court_type,
  -- Datos del procesador
  pp.full_name as processed_by_name
FROM public.special_bookings sb
LEFT JOIN public.profiles p ON sb.reference_user_id = p.id
LEFT JOIN public.courts c ON sb.court_id = c.id
LEFT JOIN public.profiles pp ON sb.processed_by = pp.id
WHERE sb.status IN ('paid', 'cancelled')
  AND sb.payment_completed_at IS NOT NULL;