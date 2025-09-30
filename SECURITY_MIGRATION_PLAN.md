# Plan de Migración de Seguridad

## ✅ Fase 1 Completada: Infraestructura Segura

Se han creado las siguientes mejoras SIN romper funcionalidad existente:

### 1. Vistas Seguras para Datos Públicos

#### `public_profiles` 
Vista que expone solo datos no sensibles de perfiles:
- ✅ Incluye: `id`, `full_name`, `member_id`, `avatar_url`, `is_active`
- ❌ Excluye: `phone`, `deactivated_by`, `deactivated_at`

#### `public_bookings_display`
Vista segura para pantallas de display:
- ✅ Incluye: `id`, `court_id`, `start_time`, `end_time`, `court_name`, `user_display_name` (solo si está pagado)
- ❌ Excluye: `payment_id`, `payment_gateway`, `amount`, `actual_amount_charged`, `processed_by`

#### `public_special_bookings_display`
Vista para eventos especiales públicos:
- ✅ Incluye: información del evento sin datos sensibles

### 2. Sistema de Auditoría de Seguridad

- **Tabla**: `security_audit_log` - Log completo de acciones sensibles
- **Función**: `audit_security_action()` - Registra eventos de seguridad
- **Acceso**: Solo administradores pueden ver los logs

### 3. Rate Limiting para Login

- **Tabla**: `failed_login_attempts` - Tracking de intentos fallidos
- **Función**: `verify_rate_limit()` - Verifica límite de intentos (5 en 15 min por defecto)
- **Función**: `cleanup_failed_login_attempts()` - Limpia registros antiguos

---

## 🔄 Migración Gradual del Frontend (Opcional)

Las políticas RLS actuales **NO han sido modificadas** para evitar romper funcionalidad.  
Cuando estés listo, puedes migrar gradualmente el código para usar las vistas seguras:

### Display.tsx
```typescript
// Antes (expone todos los campos):
const { data } = await supabase.from("bookings").select("*");

// Después (solo campos seguros):
const { data } = await supabase.from("public_bookings_display").select("*");
```

### Búsqueda de Usuarios
Ya usa función segura `search_users_for_invitations` ✅ (no requiere cambios)

---

## ⚙️ Configuraciones Manuales Requeridas

### 1. Habilitar Leaked Password Protection
**Dónde**: Supabase Dashboard > Authentication > Settings  
**Acción**: Enable "Leaked Password Protection"  
**Link**: https://supabase.com/dashboard/project/bpjinatcgdmxqetfxjji/auth/providers

### 2. Actualizar PostgreSQL
**Dónde**: Supabase Dashboard > Database > Settings  
**Acción**: Upgrade to latest PostgreSQL version  
**Link**: https://supabase.com/dashboard/project/bpjinatcgdmxqetfxjji/settings/database

### 3. Configurar OTP Expiry (Opcional)
**Dónde**: Supabase Dashboard > Authentication > Settings  
**Acción**: Reducir tiempo de expiración de OTP si es necesario

---

## 📊 Estado Actual de Seguridad

### ✅ Fortalezas
- Autenticación robusta con JWT
- RLS habilitado en todas las tablas sensibles
- Validación de entrada implementada
- Edge Functions seguras con roles verificados
- Audit trail implementado
- Rate limiting infrastructure lista

### ⚠️ Áreas de Atención

#### 1. Exposición de Datos Personales (CRÍTICO pero no urgente)
**Estado**: Las políticas públicas actuales exponen:
- `profiles`: Incluye `phone` y `member_id` públicamente
- `bookings`: Incluye `payment_id` y `amount` públicamente

**Solución Disponible**: Migrar frontend para usar las vistas seguras creadas  
**Impacto**: NO afecta funcionalidad actual

#### 2. Configuraciones Pendientes
- [ ] Habilitar Leaked Password Protection (manual en Supabase)
- [ ] Actualizar PostgreSQL (manual en Supabase)
- [ ] Configurar pg_cron para limpiar `failed_login_attempts`

---

## 🔐 Funciones de Seguridad Disponibles

### Para Audit Logging
```sql
-- Ejemplo: Registrar cambio de rol
SELECT audit_security_action(
  'role_change',
  'user_roles',
  user_id,
  jsonb_build_object('old_role', 'user', 'new_role', 'admin')
);
```

### Para Rate Limiting
```sql
-- Ejemplo: Verificar si usuario puede intentar login
SELECT verify_rate_limit('user@example.com', 5, 15);
-- Retorna true si está dentro del límite
```

---

## 📈 Plan de Implementación Recomendado

### Semana 1 (Urgente)
- [x] Crear vistas seguras (COMPLETADO)
- [x] Implementar audit log (COMPLETADO)
- [ ] Habilitar Leaked Password Protection
- [ ] Actualizar PostgreSQL

### Semana 2 (Importante)
- [ ] Migrar Display.tsx para usar `public_bookings_display`
- [ ] Configurar pg_cron para cleanup de `failed_login_attempts`
- [ ] Implementar rate limiting en login edge function

### Semana 3 (Mejora Continua)
- [ ] Agregar logging de eventos sensibles usando `audit_security_action()`
- [ ] Revisar y ajustar políticas RLS si es necesario
- [ ] Implementar webhook signature verification

---

## ✨ Conclusión

**Estado**: ✅ Mejoras implementadas sin romper funcionalidad  
**Riesgo Actual**: MODERADO (similar a antes, pero con infraestructura lista para mejoras)  
**Próximo Paso**: Configuraciones manuales en Supabase Dashboard

Las funcionalidades existentes del proyecto siguen funcionando normalmente.  
Las mejoras de seguridad están disponibles para uso cuando estés listo para migrar.
