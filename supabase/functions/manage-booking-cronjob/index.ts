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

// Global variable to store current user ID for RPC calls
let currentUserId: string;

interface CronjobRequest {
  action: 'create' | 'delete' | 'status';
  frequency?: string; // cron expression, default: '*/30 * * * *' (every 30 minutes)
}

async function checkCronjobStatus(): Promise<{ exists: boolean; schedule?: string }> {
  console.log('🔍 Checking cronjob status...');
  
  try {
    // Use the new direct function that doesn't rely on auth context
    const { data, error } = await supabase.rpc('manage_cronjob_direct', {
      action_type: 'status',
      user_id_param: currentUserId,
      cronjob_name: CRONJOB_NAME
    });

    if (error) {
      console.error('Error checking cronjob status:', error);
      return { exists: false };
    }

    console.log('✅ Cronjob status result:', data);
    return {
      exists: data.exists || false,
      schedule: data.schedule || undefined
    };
  } catch (error) {
    console.error('Exception checking cronjob:', error);
    return { exists: false };
  }
}

async function createCronjob(frequency: string = '*/30 * * * *'): Promise<{ success: boolean; message: string }> {
  console.log(`📅 Creating cronjob with frequency: ${frequency}`);
  
  try {
    // Use the new direct function
    const { data, error } = await supabase.rpc('manage_cronjob_direct', {
      action_type: 'create',
      user_id_param: currentUserId,
      cronjob_name: CRONJOB_NAME,
      frequency: frequency
    });

    if (error) {
      console.error('Error creating cronjob:', error);
      return { success: false, message: `Error creating cronjob: ${error.message}` };
    }

    console.log('✅ Cronjob creation result:', data);
    return {
      success: data.success || false,
      message: data.message || 'Cronjob operation completed'
    };
  } catch (error) {
    console.error('Exception creating cronjob:', error);
    return { success: false, message: `Exception: ${error.message}` };
  }
}

async function deleteCronjob(): Promise<{ success: boolean; message: string }> {
  console.log('🗑️ Deleting cronjob...');
  
  try {
    // Use the new direct function
    const { data, error } = await supabase.rpc('manage_cronjob_direct', {
      action_type: 'delete',
      user_id_param: currentUserId,
      cronjob_name: CRONJOB_NAME
    });

    if (error) {
      console.error('Error deleting cronjob:', error);
      return { success: false, message: `Error deleting cronjob: ${error.message}` };
    }

    console.log('✅ Cronjob deletion result:', data);
    return {
      success: data.success || false,
      message: data.message || 'Cronjob operation completed'
    };
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
    
    // Store user ID for use in RPC calls
    currentUserId = user.id;

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