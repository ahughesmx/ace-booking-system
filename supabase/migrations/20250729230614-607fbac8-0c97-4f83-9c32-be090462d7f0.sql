-- Habilitar la extensión pg_cron si no está habilitada
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Crear un cron job que ejecute la limpieza de partidos incompletos
-- Ejecutar cada hora la función de limpieza
SELECT cron.schedule(
  'cleanup-incomplete-matches',
  '0 * * * *', -- Cada hora en el minuto 0
  $$
  SELECT
    net.http_post(
        url:='https://bpjinatcgdmxqetfxjji.supabase.co/functions/v1/cleanup-incomplete-matches',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwamluYXRjZ2RteHFldGZ4amppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU5NDU1NTgsImV4cCI6MjA1MTUyMTU1OH0.79yLPqxNagQqouMrbfCyfLeaEeg3TesEqQsrR9H_ZvQ"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);