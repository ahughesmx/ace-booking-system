-- Migración: Sincronización de transacciones del día con el sistema Control CDV (Corte de Caja en Recepción)
-- Permite que operadores, supervisores, administradores y la Edge Function control-cdv-sync
-- obtengan todas las transacciones financieras del día con folios de recibo, socio (acción), cancha y operador.

CREATE OR REPLACE FUNCTION public.get_daily_transactions_for_control_cdv(
  p_start_date timestamptz,
  p_end_date timestamptz,
  p_operator_id uuid DEFAULT NULL,
  p_only_cash boolean DEFAULT FALSE
)
RETURNS TABLE (
  id uuid,
  booking_type text,
  folio text,
  status text,
  payment_timestamp timestamptz,
  start_time timestamptz,
  end_time timestamptz,
  amount numeric,
  currency text,
  payment_method text,
  payment_gateway text,
  payment_id text,
  user_id uuid,
  user_full_name text,
  user_member_id text,
  user_phone text,
  court_id uuid,
  court_name text,
  court_type text,
  processed_by uuid,
  processed_by_name text,
  title text,
  event_type text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_role text;
BEGIN
  -- Permitir ejecución desde service_role (Edge Functions) o usuarios con rol admin, supervisor u operador
  IF auth.role() <> 'service_role' THEN
    SELECT ur.role::text
      INTO v_caller_role
      FROM public.user_roles ur
     WHERE ur.user_id = auth.uid()
       AND ur.role IN ('admin', 'supervisor', 'operador')
     LIMIT 1;

    IF v_caller_role IS NULL THEN
      RAISE EXCEPTION 'Acceso denegado: Se requiere rol de operador, supervisor o administrador para sincronizar el corte de caja';
    END IF;
  END IF;

  RETURN QUERY
  WITH latest_receipts AS (
    SELECT DISTINCT ON (rn.booking_id)
      rn.booking_id,
      rn.receipt_number
    FROM public.receipt_numbers rn
    WHERE rn.booking_id IS NOT NULL
    ORDER BY rn.booking_id, rn.created_at DESC
  ),
  combined_tx AS (
    -- 1. Reservas regulares cobradas (Ventanilla y En Línea)
    SELECT
      b.id,
      'regular'::text AS booking_type,
      COALESCE(lr.receipt_number, 'RES-' || UPPER(SUBSTRING(b.id::text FROM 1 FOR 8))) AS folio,
      b.status::text AS status,
      COALESCE(b.payment_completed_at, b.booking_made_at, b.created_at) AS payment_timestamp,
      b.start_time,
      b.end_time,
      COALESCE(b.actual_amount_charged, b.amount, 0)::numeric AS amount,
      COALESCE(b.currency, 'MXN')::text AS currency,
      COALESCE(b.payment_method, 'online')::text AS payment_method,
      COALESCE(
        b.payment_gateway,
        CASE
          WHEN b.payment_method IN ('cash', 'efectivo') THEN 'efectivo'
          ELSE 'online'
        END
      )::text AS payment_gateway,
      b.payment_id::text AS payment_id,
      b.user_id,
      p.full_name::text AS user_full_name,
      p.member_id::text AS user_member_id,
      p.phone::text AS user_phone,
      b.court_id,
      c.name::text AS court_name,
      c.court_type::text AS court_type,
      b.processed_by,
      pp.full_name::text AS processed_by_name,
      NULL::text AS title,
      NULL::text AS event_type
    FROM public.bookings b
    LEFT JOIN public.profiles p ON b.user_id = p.id
    LEFT JOIN public.courts c ON b.court_id = c.id
    LEFT JOIN public.profiles pp ON b.processed_by = pp.id
    LEFT JOIN latest_receipts lr ON lr.booking_id = b.id
    WHERE b.status IN ('paid', 'cancelled')
      AND (b.payment_completed_at IS NOT NULL OR b.status = 'paid')

    UNION ALL

    -- 2. Reservas especiales con cobro registrado
    SELECT
      sb.id,
      'special'::text AS booking_type,
      ('ESP-' || UPPER(SUBSTRING(sb.id::text FROM 1 FOR 8)))::text AS folio,
      COALESCE(sb.status, 'paid')::text AS status,
      COALESCE(sb.payment_completed_at, sb.created_at) AS payment_timestamp,
      sb.start_time,
      sb.end_time,
      COALESCE(
        public.calculate_special_booking_price(
          sb.price_type,
          sb.custom_price,
          sb.court_id,
          sb.start_time,
          sb.end_time
        ),
        sb.custom_price,
        0
      )::numeric AS amount,
      'MXN'::text AS currency,
      COALESCE(sb.payment_method, 'efectivo')::text AS payment_method,
      'admin'::text AS payment_gateway,
      NULL::text AS payment_id,
      sb.reference_user_id AS user_id,
      COALESCE(p.full_name, sb.title)::text AS user_full_name,
      p.member_id::text AS user_member_id,
      p.phone::text AS user_phone,
      sb.court_id,
      c.name::text AS court_name,
      c.court_type::text AS court_type,
      COALESCE(sb.processed_by, sb.created_by) AS processed_by,
      pp.full_name::text AS processed_by_name,
      sb.title::text AS title,
      sb.event_type::text AS event_type
    FROM public.special_bookings sb
    LEFT JOIN public.profiles p ON sb.reference_user_id = p.id
    LEFT JOIN public.courts c ON sb.court_id = c.id
    LEFT JOIN public.profiles pp ON COALESCE(sb.processed_by, sb.created_by) = pp.id
    WHERE COALESCE(sb.status, 'paid') IN ('paid', 'cancelled')
      AND sb.payment_completed_at IS NOT NULL
  )
  SELECT
    ctx.id,
    ctx.booking_type,
    ctx.folio,
    ctx.status,
    ctx.payment_timestamp,
    ctx.start_time,
    ctx.end_time,
    ctx.amount,
    ctx.currency,
    ctx.payment_method,
    ctx.payment_gateway,
    ctx.payment_id,
    ctx.user_id,
    ctx.user_full_name,
    ctx.user_member_id,
    ctx.user_phone,
    ctx.court_id,
    ctx.court_name,
    ctx.court_type,
    ctx.processed_by,
    ctx.processed_by_name,
    ctx.title,
    ctx.event_type
  FROM combined_tx ctx
  WHERE ctx.payment_timestamp >= p_start_date
    AND ctx.payment_timestamp <= p_end_date
    AND (p_operator_id IS NULL OR ctx.processed_by = p_operator_id)
    AND (NOT p_only_cash OR ctx.payment_method IN ('cash', 'efectivo'))
  ORDER BY ctx.payment_timestamp ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_daily_transactions_for_control_cdv(timestamptz, timestamptz, uuid, boolean) TO authenticated, service_role;
