-- Ensure realtime works for user_registration_requests
ALTER TABLE public.user_registration_requests REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'user_registration_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_registration_requests;
  END IF;
END $$;