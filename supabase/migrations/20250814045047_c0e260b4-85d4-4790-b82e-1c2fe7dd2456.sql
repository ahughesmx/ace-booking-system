-- Agregar nuevos tipos de eventos webhook para registro de usuarios
UPDATE webhooks SET event_type = 'user_registration_approved' WHERE event_type = 'user_registration_approved';
UPDATE webhooks SET event_type = 'user_registration_rejected' WHERE event_type = 'user_registration_rejected';

-- Los eventos ya están creados implícitamente por el constraint, pero los agregamos para documentación
-- user_registration_approved: Se dispara cuando un operador/admin aprueba una solicitud
-- user_registration_rejected: Se dispara cuando un operador/admin rechaza una solicitud