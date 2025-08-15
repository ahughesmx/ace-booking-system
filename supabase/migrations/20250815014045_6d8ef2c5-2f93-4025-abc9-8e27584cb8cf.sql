-- ARREGLAR LAS ÚLTIMAS FUNCIONES RESTANTES (buscar las que faltan)

-- 1. FUNCIÓN update_match_rankings
CREATE OR REPLACE FUNCTION public.update_match_rankings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  player1_wins integer := 0;
  player2_wins integer := 0;
  player1_points integer := 0;
  player2_points integer := 0;
BEGIN
  -- Only process if both players confirmed and match has scores
  IF NEW.is_confirmed_player1 = true 
     AND NEW.is_confirmed_player2 = true 
     AND (NEW.player1_sets > 0 OR NEW.player2_sets > 0) THEN
    
    -- Determine winner and points
    IF NEW.player1_sets > NEW.player2_sets THEN
      player1_wins := 1;
      player1_points := 3;  -- Winner gets 3 points
      player2_points := 1;  -- Loser gets 1 point
    ELSE
      player2_wins := 1;
      player2_points := 3;  -- Winner gets 3 points
      player1_points := 1;  -- Loser gets 1 point
    END IF;
    
    -- Update player1 ranking
    INSERT INTO public.rankings (user_id, wins, losses, points)
    VALUES (NEW.player1_id, player1_wins, 1 - player1_wins, player1_points)
    ON CONFLICT (user_id)
    DO UPDATE SET
      wins = public.rankings.wins + player1_wins,
      losses = public.rankings.losses + (1 - player1_wins),
      points = public.rankings.points + player1_points,
      updated_at = now();
    
    -- Update player2 ranking
    INSERT INTO public.rankings (user_id, wins, losses, points)
    VALUES (NEW.player2_id, player2_wins, 1 - player2_wins, player2_points)
    ON CONFLICT (user_id)
    DO UPDATE SET
      wins = public.rankings.wins + player2_wins,
      losses = public.rankings.losses + (1 - player2_wins),
      points = public.rankings.points + player2_points,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. FUNCIÓN update_class_participants_count
CREATE OR REPLACE FUNCTION public.update_class_participants_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.classes
  SET current_participants = (
    SELECT COUNT(*)
    FROM public.course_enrollments ce
    WHERE ce.course_id = (SELECT course_id FROM public.classes WHERE id = NEW.class_id)
      AND ce.status = 'active'
  )
  WHERE id = NEW.class_id;
  
  RETURN NEW;
END;
$$;

-- 3. FUNCIÓN invalidate_booking_cache
CREATE OR REPLACE FUNCTION public.invalidate_booking_cache()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Esta función se ejecuta cuando se actualizan court_type_settings
  -- Para notificar que las validaciones pueden haber cambiado
  NOTIFY court_settings_updated, 'Court type settings have been updated';
  RETURN NEW;
END;
$$;

-- 4. FUNCIÓN recalculate_active_bookings (la función sin parámetros)
CREATE OR REPLACE FUNCTION public.recalculate_active_bookings()
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE profiles p
  SET active_bookings = (
    SELECT COUNT(*)
    FROM bookings b
    WHERE b.user_id = p.id
    AND (
      b.end_time > NOW() 
      OR 
      (b.end_time <= NOW() AND b.end_time > NOW() - INTERVAL '2 hours')
    )
  );
END;
$$;