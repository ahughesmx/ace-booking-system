-- Create cron job to run booking reminders every hour
-- First enable the pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the booking reminders to run every hour
SELECT cron.schedule(
  'booking-reminders-hourly',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://bpjinatcgdmxqetfxjji.supabase.co/functions/v1/booking-reminders',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwamluYXRjZ2RteHFldGZ4amppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTk0NTU1OCwiZXhwIjoyMDUxNTIxNTU4fQ.hJcqiQgqSBV8kpJmZJWe4d3D6aNiQdEHgZ0jNKhR5LM"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);