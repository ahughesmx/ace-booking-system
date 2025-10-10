-- Paso 1: Agregar el rol 'supervisor' al enum
-- Esto debe hacerse en una transacción separada antes de poder usarlo

DO $$
BEGIN
  -- Verificar si el valor ya existe antes de agregarlo
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'supervisor' 
    AND enumtypid = 'user_role'::regtype
  ) THEN
    ALTER TYPE user_role ADD VALUE 'supervisor';
  END IF;
END
$$;

-- Comentario para documentar el nuevo rol
COMMENT ON TYPE user_role IS 'Roles de usuario: admin (acceso total), supervisor (operador + reagendar + reportes + gestión usuarios), operador (cobros y reportes propios), user (usuario regular)';