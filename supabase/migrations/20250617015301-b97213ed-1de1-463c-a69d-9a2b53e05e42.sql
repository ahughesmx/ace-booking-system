
-- Fix search_path security issues by setting SECURITY DEFINER and immutable search_path

-- Fix handle_updated_at function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix recalculate_active_bookings function
CREATE OR REPLACE FUNCTION public.recalculate_active_bookings(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  active_count integer;
BEGIN
  -- Count active bookings for the user
  SELECT COUNT(*) INTO active_count
  FROM public.bookings
  WHERE user_id = user_uuid
    AND end_time > now();
  
  -- Update the user's active_bookings count
  UPDATE public.profiles
  SET active_bookings = active_count
  WHERE id = user_uuid;
END;
$$;

-- Fix update_active_bookings function
CREATE OR REPLACE FUNCTION public.update_active_bookings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Handle INSERT/UPDATE
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM public.recalculate_active_bookings(NEW.user_id);
    RETURN NEW;
  END IF;
  
  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_active_bookings(OLD.user_id);
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Fix update_match_rankings function
CREATE OR REPLACE FUNCTION public.update_match_rankings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

-- Fix validate_booking function
CREATE OR REPLACE FUNCTION public.validate_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  booking_rules_rec record;
  user_active_bookings integer;
  existing_booking_count integer;
BEGIN
  -- Get booking rules for the court type
  SELECT * INTO booking_rules_rec
  FROM public.booking_rules br
  JOIN public.courts c ON c.court_type = br.court_type
  WHERE c.id = NEW.court_id
  LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No booking rules found for this court type';
  END IF;
  
  -- Check if booking is too far in advance
  IF NEW.start_time > (CURRENT_DATE + booking_rules_rec.max_days_ahead * INTERVAL '1 day') THEN
    RAISE EXCEPTION 'Cannot book more than % days in advance', booking_rules_rec.max_days_ahead;
  END IF;
  
  -- Check if booking is in the past
  IF NEW.start_time < now() THEN
    RAISE EXCEPTION 'Cannot book in the past';
  END IF;
  
  -- Check user's active bookings limit
  SELECT active_bookings INTO user_active_bookings
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  IF user_active_bookings >= booking_rules_rec.max_active_bookings THEN
    RAISE EXCEPTION 'User has reached maximum active bookings limit of %', booking_rules_rec.max_active_bookings;
  END IF;
  
  -- Check for overlapping bookings
  SELECT COUNT(*) INTO existing_booking_count
  FROM public.bookings
  WHERE court_id = NEW.court_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND (
      (start_time <= NEW.start_time AND end_time > NEW.start_time) OR
      (start_time < NEW.end_time AND end_time >= NEW.end_time) OR
      (start_time >= NEW.start_time AND end_time <= NEW.end_time)
    );
  
  IF existing_booking_count > 0 THEN
    RAISE EXCEPTION 'Court is already booked for this time slot';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add missing unique constraint on rankings table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'rankings_user_id_key'
  ) THEN
    ALTER TABLE public.rankings ADD CONSTRAINT rankings_user_id_key UNIQUE (user_id);
  END IF;
END;
$$;
