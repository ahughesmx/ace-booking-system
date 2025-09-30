-- ============================================
-- SECURITY FIXES - PHASE 1: Views para datos públicos
-- ============================================

-- Vista pública de perfiles (solo datos no sensibles)
CREATE OR REPLACE VIEW public_profiles AS
SELECT 
  id,
  full_name,
  member_id,
  avatar_url,
  is_active,
  created_at
FROM profiles
WHERE full_name IS NOT NULL AND full_name != '';

-- RLS para la vista pública de perfiles
ALTER VIEW public_profiles SET (security_invoker = true);

-- Vista pública de reservas para display
CREATE OR REPLACE VIEW public_bookings_display AS
SELECT 
  b.id,
  b.court_id,
  b.start_time,
  b.end_time,
  b.status,
  c.name as court_name,
  c.court_type,
  CASE 
    WHEN b.status = 'paid' THEN p.full_name
    ELSE NULL
  END as user_display_name
FROM bookings b
LEFT JOIN courts c ON b.court_id = c.id
LEFT JOIN profiles p ON b.user_id = p.id
WHERE b.status IN ('paid', 'pending_payment');

ALTER VIEW public_bookings_display SET (security_invoker = true);

-- Vista pública de special bookings
CREATE OR REPLACE VIEW public_special_bookings_display AS
SELECT 
  id,
  court_id,
  start_time,
  end_time,
  event_type,
  title,
  description,
  created_at
FROM special_bookings;

ALTER VIEW public_special_bookings_display SET (security_invoker = true);

-- ============================================
-- SECURITY FIXES - PHASE 2: Security Audit Log
-- ============================================

-- Tabla para auditoría de acciones sensibles
CREATE TABLE IF NOT EXISTS security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action_type text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  details jsonb DEFAULT '{}',
  ip_address text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_audit_user ON security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_action ON security_audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_created ON security_audit_log(created_at DESC);

ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view security logs"
ON security_audit_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Función para registrar eventos de seguridad
CREATE OR REPLACE FUNCTION audit_security_action(
  p_action_type text,
  p_table_name text,
  p_record_id uuid DEFAULT NULL,
  p_details jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO security_audit_log (
    user_id,
    action_type,
    table_name,
    record_id,
    details
  ) VALUES (
    auth.uid(),
    p_action_type,
    p_table_name,
    p_record_id,
    p_details
  );
END;
$$;

-- ============================================
-- SECURITY FIXES - PHASE 3: Rate Limiting
-- ============================================

-- Tabla para tracking de intentos fallidos
CREATE TABLE IF NOT EXISTS failed_login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address text,
  attempt_time timestamp with time zone DEFAULT now(),
  user_agent text
);

CREATE INDEX IF NOT EXISTS idx_failed_logins_email ON failed_login_attempts(email, attempt_time DESC);
CREATE INDEX IF NOT EXISTS idx_failed_logins_ip ON failed_login_attempts(ip_address, attempt_time DESC);
CREATE INDEX IF NOT EXISTS idx_failed_logins_time ON failed_login_attempts(attempt_time DESC);

ALTER TABLE failed_login_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can insert failed login attempts"
ON failed_login_attempts FOR INSERT
WITH CHECK (true);

-- Función para verificar rate limiting
CREATE OR REPLACE FUNCTION verify_rate_limit(
  p_email text,
  p_max_attempts integer DEFAULT 5,
  p_window_minutes integer DEFAULT 15
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attempt_count integer;
BEGIN
  SELECT COUNT(*) INTO attempt_count
  FROM failed_login_attempts
  WHERE email = p_email
    AND attempt_time > (now() - (p_window_minutes || ' minutes')::interval);
  
  RETURN attempt_count < p_max_attempts;
END;
$$;

-- Función para limpiar intentos antiguos
CREATE OR REPLACE FUNCTION cleanup_failed_login_attempts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM failed_login_attempts
  WHERE attempt_time < (now() - interval '24 hours');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- ============================================
-- Documentación
-- ============================================

COMMENT ON VIEW public_profiles IS 
'Vista segura: solo expone datos no sensibles de perfiles (sin phone).';

COMMENT ON VIEW public_bookings_display IS 
'Vista segura: solo muestra ocupación de canchas sin datos de pago.';

COMMENT ON TABLE security_audit_log IS 
'Log de auditoría para acciones sensibles. Solo admins.';

COMMENT ON FUNCTION audit_security_action IS 
'Registra eventos de seguridad importantes.';

COMMENT ON FUNCTION verify_rate_limit IS 
'Verifica límite de intentos de login.';

COMMENT ON FUNCTION cleanup_failed_login_attempts IS 
'Limpia registros antiguos de intentos fallidos (ejecutar vía pg_cron).';