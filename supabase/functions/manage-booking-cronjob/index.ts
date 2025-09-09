import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CRONJOB_NAME = 'booking-reminders-job';
const FUNCTION_URL = `${supabaseUrl}/functions/v1/booking-reminders`;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

interface CronjobRequest {
  action: 'create' | 'delete' | 'status';
  frequency?: string; // cron expression, default: '*/30 * * * *' (every 30 minutes)
}

async function checkCronjobStatus(): Promise<{ exists: boolean; schedule?: string }> {
  console.log('🔍 Checking cronjob status...');
  
  try {
    // Query cronjobs directly using service role
    const { data, error } = await supabase
      .rpc('execute_cronjob_sql', {
        sql_query: `SELECT jobname, schedule FROM cron.job WHERE jobname = '${CRONJOB_NAME}' LIMIT 1;`
      });

    if (error) {
      console.error('Error checking cronjob status:', error);
      return { exists: false };
    }

    if (data && Array.isArray(data) && data.length > 0) {
      console.log('✅ Cronjob exists:', data[0]);
      return { exists: true, schedule: data[0].schedule };
    }

    console.log('❌ Cronjob does not exist');
    return { exists: false };
  } catch (error) {
    console.error('Exception checking cronjob:', error);
    return { exists: false };
  }
}

async function createCronjob(frequency: string = '*/30 * * * *'): Promise<{ success: boolean; message: string }> {
  console.log(`📅 Creating cronjob with frequency: ${frequency}`);
  
  try {
    // First check if it already exists
    const status = await checkCronjobStatus();
    if (status.exists) {
      return { success: false, message: 'Cronjob already exists' };
    }

    const cronQuery = `
      SELECT cron.schedule(
        '${CRONJOB_NAME}',
        '${frequency}',
        $$
        SELECT
          net.http_post(
              url:='${FUNCTION_URL}',
              headers:='{"Content-Type": "application/json", "Authorization": "Bearer ${ANON_KEY}"}'::jsonb,
              body:='{}'::jsonb
          ) as request_id;
        $$
      );
    `;

    const { error } = await supabase.rpc('execute_cronjob_sql', { sql_query: cronQuery });

    if (error) {
      console.error('Error creating cronjob:', error);
      return { success: false, message: `Error creating cronjob: ${error.message}` };
    }

    console.log('✅ Cronjob created successfully');
    return { success: true, message: 'Cronjob created successfully' };
  } catch (error) {
    console.error('Exception creating cronjob:', error);
    return { success: false, message: `Exception: ${error.message}` };
  }
}

async function deleteCronjob(): Promise<{ success: boolean; message: string }> {
  console.log('🗑️ Deleting cronjob...');
  
  try {
    const { error } = await supabase.rpc('execute_cronjob_sql', {
      sql_query: `SELECT cron.unschedule('${CRONJOB_NAME}');`
    });

    if (error) {
      console.error('Error deleting cronjob:', error);
      return { success: false, message: `Error deleting cronjob: ${error.message}` };
    }

    console.log('✅ Cronjob deleted successfully');
    return { success: true, message: 'Cronjob deleted successfully' };
  } catch (error) {
    console.error('Exception deleting cronjob:', error);
    return { success: false, message: `Exception: ${error.message}` };
  }
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Booking cronjob management function called');
    
    // Verify user is admin - Check user role directly
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('❌ Invalid token:', userError);
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log('👤 User authenticated:', user.id);

    // Check if user is admin - Direct query to bypass RLS issues
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    console.log('🔍 Role check result:', { userRole, roleError });

    if (roleError) {
      console.error('❌ Error checking user role:', roleError);
      return new Response(JSON.stringify({ error: 'Error checking permissions' }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!userRole) {
      console.error('❌ User is not admin:', user.id);
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log('✅ Admin access verified for user:', user.id);

    const requestData: CronjobRequest = await req.json();
    console.log('📋 Request data:', JSON.stringify(requestData));
    let result;

    switch (requestData.action) {
      case 'status':
        result = await checkCronjobStatus();
        break;
      
      case 'create':
        result = await createCronjob(requestData.frequency);
        break;
      
      case 'delete':
        result = await deleteCronjob();
        break;
      
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
    }
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error('❌ Error in cronjob management function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);