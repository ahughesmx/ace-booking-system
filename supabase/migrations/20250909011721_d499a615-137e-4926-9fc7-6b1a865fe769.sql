-- Enable pg_cron and pg_net extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a safe SQL execution function for cronjob management
CREATE OR REPLACE FUNCTION public.execute_cronjob_sql(sql_query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  is_admin boolean;
BEGIN
  -- Check if the current user is an admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) INTO is_admin;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Only admins can execute cronjob management operations';
  END IF;
  
  -- Only allow specific cronjob-related operations
  IF sql_query ILIKE '%cron.schedule%' OR 
     sql_query ILIKE '%cron.unschedule%' OR 
     sql_query ILIKE '%SELECT * FROM cron.job%' OR
     sql_query ILIKE '%SELECT jobname, schedule FROM cron.job%' THEN
    
    -- Execute the query and return results as JSON
    EXECUTE sql_query;
    
    -- For SELECT queries, return the result
    IF sql_query ILIKE 'SELECT%' THEN
      EXECUTE 'SELECT array_to_json(array_agg(row_to_json(t))) FROM (' || sql_query || ') t' INTO result;
      RETURN COALESCE(result, '[]'::json);
    ELSE
      RETURN '{"success": true}'::json;
    END IF;
    
  ELSE
    RAISE EXCEPTION 'Unauthorized SQL operation. Only cronjob management operations are allowed.';
  END IF;
END;
$$;