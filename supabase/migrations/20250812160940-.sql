-- Corregir el trigger que tiene errores de casting
CREATE OR REPLACE FUNCTION public.notify_match_player_registered()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  webhook_rec record;
  match_details record;
  registered_player record;
  sender_player record;
  webhook_data jsonb;
  position_changed text;
  headers_obj jsonb;
BEGIN
  -- Detectar qué posición cambió
  position_changed := NULL;
  
  IF OLD.player2_id IS NULL AND NEW.player2_id IS NOT NULL THEN
    position_changed := 'player2';
  ELSIF OLD.player1_partner_id IS NULL AND NEW.player1_partner_id IS NOT NULL THEN
    position_changed := 'player1_partner';
  ELSIF OLD.player2_partner_id IS NULL AND NEW.player2_partner_id IS NOT NULL THEN
    position_changed := 'player2_partner';
  END IF;
  
  -- Solo proceder si hay un cambio de posición relevante
  IF position_changed IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Obtener detalles completos del match
  SELECT 
    m.*,
    json_build_object(
      'id', b.id,
      'start_time', b.start_time,
      'end_time', b.end_time,
      'court', json_build_object(
        'id', c.id,
        'name', c.name,
        'court_type', c.court_type
      )
    ) as booking_data,
    json_build_object('id', p1.id, 'full_name', p1.full_name, 'phone', p1.phone) as player1_data,
    json_build_object('id', p2.id, 'full_name', p2.full_name, 'phone', p2.phone) as player2_data,
    json_build_object('id', p1p.id, 'full_name', p1p.full_name, 'phone', p1p.phone) as player1_partner_data,
    json_build_object('id', p2p.id, 'full_name', p2p.full_name, 'phone', p2p.phone) as player2_partner_data
  INTO match_details
  FROM matches m
  LEFT JOIN bookings b ON m.booking_id = b.id
  LEFT JOIN courts c ON b.court_id = c.id
  LEFT JOIN profiles p1 ON m.player1_id = p1.id
  LEFT JOIN profiles p2 ON m.player2_id = p2.id
  LEFT JOIN profiles p1p ON m.player1_partner_id = p1p.id
  LEFT JOIN profiles p2p ON m.player2_partner_id = p2p.id
  WHERE m.id = NEW.id;
  
  -- Construir payload del webhook usando los datos directamente
  webhook_data := jsonb_build_object(
    'match_id', NEW.id,
    'invitation_id', NULL,
    'sender_id', CASE position_changed 
      WHEN 'player2' THEN NEW.player1_id
      WHEN 'player1_partner' THEN NEW.player1_id  
      WHEN 'player2_partner' THEN NEW.player2_id
    END,
    'sender_name', CASE position_changed 
      WHEN 'player2' THEN match_details.player1_data->>'full_name'
      WHEN 'player1_partner' THEN match_details.player1_data->>'full_name'
      WHEN 'player2_partner' THEN match_details.player2_data->>'full_name'
    END,
    'sender_phone', CASE position_changed 
      WHEN 'player2' THEN match_details.player1_data->>'phone'
      WHEN 'player1_partner' THEN match_details.player1_data->>'phone'
      WHEN 'player2_partner' THEN match_details.player2_data->>'phone'
    END,
    'recipient_id', CASE position_changed
      WHEN 'player2' THEN NEW.player2_id
      WHEN 'player1_partner' THEN NEW.player1_partner_id
      WHEN 'player2_partner' THEN NEW.player2_partner_id
    END,
    'recipient_name', CASE position_changed
      WHEN 'player2' THEN match_details.player2_data->>'full_name'
      WHEN 'player1_partner' THEN match_details.player1_partner_data->>'full_name'
      WHEN 'player2_partner' THEN match_details.player2_partner_data->>'full_name'
    END,
    'recipient_phone', CASE position_changed
      WHEN 'player2' THEN match_details.player2_data->>'phone'
      WHEN 'player1_partner' THEN match_details.player1_partner_data->>'phone'
      WHEN 'player2_partner' THEN match_details.player2_partner_data->>'phone'
    END,
    'remotejid', CASE position_changed
      WHEN 'player2' THEN match_details.player2_data->>'phone'
      WHEN 'player1_partner' THEN match_details.player1_partner_data->>'phone'
      WHEN 'player2_partner' THEN match_details.player2_partner_data->>'phone'
    END,
    'position', position_changed,
    'is_doubles', NEW.is_doubles,
    'court_name', match_details.booking_data->'court'->>'name',
    'court_type', match_details.booking_data->'court'->>'court_type',
    'start_time', match_details.booking_data->>'start_time',
    'end_time', match_details.booking_data->>'end_time',
    'date', CASE 
      WHEN match_details.booking_data->>'start_time' IS NOT NULL 
      THEN to_char((match_details.booking_data->>'start_time')::timestamp, 'YYYY-MM-DD')
      ELSE NULL 
    END,
    'time', CASE 
      WHEN match_details.booking_data->>'start_time' IS NOT NULL 
      THEN to_char((match_details.booking_data->>'start_time')::timestamp, 'HH24:MI')
      ELSE NULL 
    END,
    'player1_name', match_details.player1_data->>'full_name',
    'player1_phone', match_details.player1_data->>'phone',
    'player2_name', match_details.player2_data->>'full_name',
    'player2_phone', match_details.player2_data->>'phone',
    'player1_partner_name', match_details.player1_partner_data->>'full_name',
    'player1_partner_phone', match_details.player1_partner_data->>'phone',
    'player2_partner_name', match_details.player2_partner_data->>'full_name',
    'player2_partner_phone', match_details.player2_partner_data->>'phone'
  );
  
  -- Disparar webhooks activos para match_invitation_sent
  FOR webhook_rec IN 
    SELECT * FROM webhooks 
    WHERE event_type = 'match_invitation_sent' AND is_active = true
  LOOP
    BEGIN
      -- Preparar headers
      headers_obj := COALESCE(webhook_rec.headers, '{}'::jsonb);
      headers_obj := headers_obj || '{"Content-Type": "application/json"}'::jsonb;
      
      -- Realizar llamada HTTP al webhook usando la extensión http
      PERFORM extensions.http_post(
        url := webhook_rec.url,
        headers := headers_obj,
        body := jsonb_build_object(
          'event', 'match_invitation_sent',
          'timestamp', now(),
          'data', webhook_data,
          'webhook_name', webhook_rec.name
        )::text
      );
      
      -- Log exitoso (opcional)
      RAISE LOG 'Webhook % disparado exitosamente para match player registration', webhook_rec.name;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log error pero no fallar la transacción
      RAISE LOG 'Error disparando webhook %: %', webhook_rec.name, SQLERRM;
    END;
  END LOOP;
  
  RETURN NEW;
END;
$function$;