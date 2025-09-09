-- Create a direct cronjob management function that bypasses auth context issues
CREATE OR REPLACE FUNCTION public.manage_cronjob_direct(
  action_type text,
  user_id_param uuid,
  cronjob_name text DEFAULT 'booking-reminders-job',
  frequency text DEFAULT '*/30 * * * *'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  is_admin boolean;
  function_url text;
  anon_key text;
BEGIN
  -- Check if the user is an admin by direct lookup
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = user_id_param AND role = 'admin'
  ) INTO is_admin;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Only admins can manage cronjobs';
  END IF;
  
  -- Set constants
  function_url := 'https://bpjinatcgdmxqetfxjji.supabase.co/functions/v1/booking-reminders';
  anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwamluYXRjZ2RteHFldGZ4amppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU5NDU1NTgsImV4cCI6MjA1MTUyMTU1OH0.79yLPqxNagQqouMrbfCyfLeaEeg3TesEqQsrR9H_ZvQ';
  
  IF action_type = 'status' THEN
    -- Check if cronjob exists
    SELECT json_build_object(
      'exists', CASE WHEN COUNT(*) > 0 THEN true ELSE false END,
      'schedule', MAX(schedule)
    ) INTO result
    FROM cron.job 
    WHERE jobname = cronjob_name;
    
  ELSIF action_type = 'create' THEN
    -- Check if already exists
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = cronjob_name) THEN
      result := json_build_object('success', false, 'message', 'Cronjob already exists');
    ELSE
      -- Create the cronjob
      PERFORM cron.schedule(
        cronjob_name,
        frequency,
        format('SELECT net.http_post(url:=%L, headers:=%L::jsonb, body:=%L::jsonb) as request_id;',
          function_url,
          '{"Content-Type": "application/json", "Authorization": "Bearer ' || anon_key || '"}',
          '{}'
        )
      );
      result := json_build_object('success', true, 'message', 'Cronjob created successfully');
    END IF;
    
  ELSIF action_type = 'delete' THEN
    -- Delete the cronjob
    PERFORM cron.unschedule(cronjob_name);
    result := json_build_object('success', true, 'message', 'Cronjob deleted successfully');
    
  ELSE
    RAISE EXCEPTION 'Invalid action type. Must be: status, create, or delete';
  END IF;
  
  RETURN result;
END;
$$;