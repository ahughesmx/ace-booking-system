-- CRITICAL SECURITY FIXES: Restrict data access to prevent unauthorized exposure

-- 1. FIX PROFILES TABLE - Remove public read access, allow only user's own profile + admin access
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile and admins can view all" ON public.profiles
FOR SELECT
USING (
  (auth.uid() = id) OR 
  (EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  ))
);

-- 2. FIX BOOKINGS TABLE - Remove public read access, allow only booking owners + admins
DROP POLICY IF EXISTS "Users can view bookings with court info" ON public.bookings;
DROP POLICY IF EXISTS "bookings_select_policy" ON public.bookings;

CREATE POLICY "Users can view own bookings and admins can view all" ON public.bookings
FOR SELECT
USING (
  (auth.uid() = user_id) OR 
  (EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'operador')
  ))
);

-- 3. FIX MATCHES TABLE - Ensure only participants and admins can view matches
DROP POLICY IF EXISTS "Matches are viewable by everyone" ON public.matches;

CREATE POLICY "Match participants and admins can view matches" ON public.matches
FOR SELECT
USING (
  (auth.uid() = player1_id) OR 
  (auth.uid() = player2_id) OR 
  (auth.uid() = player1_partner_id) OR 
  (auth.uid() = player2_partner_id) OR
  (EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  ))
);

-- 4. FIX RANKINGS TABLE - Remove public read access, allow only authenticated users
DROP POLICY IF EXISTS "Rankings are viewable by everyone" ON public.rankings;

CREATE POLICY "Authenticated users can view rankings" ON public.rankings
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 5. SECURE COURT MAINTENANCE - Only admins and authenticated users should see maintenance info
DROP POLICY IF EXISTS "Anyone can view court maintenance" ON public.court_maintenance;

CREATE POLICY "Authenticated users can view court maintenance" ON public.court_maintenance
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 6. SECURE INTERFACE PREFERENCES - Only authenticated users need to see these
DROP POLICY IF EXISTS "Public can view interface preferences" ON public.interface_preferences;

CREATE POLICY "Authenticated users can view interface preferences" ON public.interface_preferences
FOR SELECT
USING (auth.uid() IS NOT NULL);