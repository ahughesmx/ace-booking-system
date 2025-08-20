import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('🧹 Starting manual cleanup of expired bookings...');

  try {
    const supabaseServiceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Delete expired pending_payment bookings
    const { data: deletedBookings, error: deleteError } = await supabaseServiceClient
      .from('bookings')
      .delete()
      .eq('status', 'pending_payment')
      .lt('expires_at', new Date().toISOString())
      .select('id, start_time, end_time, expires_at, court_id');

    if (deleteError) {
      console.error('❌ Error deleting expired bookings:', deleteError);
      throw deleteError;
    }

    console.log(`✅ Deleted ${deletedBookings?.length || 0} expired bookings:`, deletedBookings);

    // Additional cleanup for August 21st bookings that might be problematic
    console.log('🎯 Checking for problematic August 21st bookings...');
    
    const { data: aug21Bookings, error: aug21Error } = await supabaseServiceClient
      .from('bookings')
      .delete()
      .eq('status', 'pending_payment')
      .gte('start_time', '2025-08-21T00:00:00Z')
      .lt('start_time', '2025-08-22T00:00:00Z')
      .select('id, start_time, end_time, expires_at');

    if (aug21Error) {
      console.error('❌ Error cleaning August 21st bookings:', aug21Error);
    } else {
      console.log(`✅ Cleaned ${aug21Bookings?.length || 0} August 21st pending bookings:`, aug21Bookings);
    }

    const totalCleaned = (deletedBookings?.length || 0) + (aug21Bookings?.length || 0);

    return new Response(JSON.stringify({
      success: true,
      message: `Successfully cleaned ${totalCleaned} expired/problematic bookings`,
      expired_bookings_deleted: deletedBookings?.length || 0,
      aug21_bookings_deleted: aug21Bookings?.length || 0,
      deleted_bookings: [...(deletedBookings || []), ...(aug21Bookings || [])]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('❌ Manual cleanup failed:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Unknown error occurred'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});