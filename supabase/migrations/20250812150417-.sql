-- Habilitar la extensión http para webhooks
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Verificar que la función existe y funciona correctamente
SELECT proname, prosrc FROM pg_proc WHERE proname = 'notify_match_player_registered';

-- Probar la conectividad HTTP (esto será útil para debugging)
COMMENT ON FUNCTION public.notify_match_player_registered() IS 
'Función que dispara webhooks cuando se registran jugadores en matches. Requiere extensión http habilitada.';