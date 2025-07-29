-- Configurar cron job para limpiar reservas expiradas cada 15 minutos
SELECT cron.schedule(
  'cleanup-expired-bookings',
  '*/15 * * * *', -- Cada 15 minutos
  $$
  SELECT
    net.http_post(
        url:='https://bpjinatcgdmxqetfxjji.supabase.co/functions/v1/cleanup-expired-bookings',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwamluYXRjZ2RteHFldGZ4amppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU5NDU1NTgsImV4cCI6MjA1MTUyMTU1OH0.79yLPqxNagQqouMrbfCyfLeaEeg3TesEqQsrR9H_ZvQ"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);