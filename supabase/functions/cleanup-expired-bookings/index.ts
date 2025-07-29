import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10'
import { corsHeaders } from '../_shared/cors.ts'

console.log("Cleanup expired bookings function is loading...")

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting cleanup process for expired bookings");

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Call the database function to cleanup expired bookings
    const { data, error } = await supabase.rpc('cleanup_expired_bookings');

    if (error) {
      console.error('Error calling cleanup function:', error);
      throw error;
    }

    const deletedCount = data || 0;
    console.log(`Cleanup completed. Deleted ${deletedCount} expired bookings`);

    // Also run a manual cleanup for any edge cases
    const now = new Date().toISOString();
    
    // Find and log any pending_payment bookings that should be expired
    const { data: pendingBookings, error: fetchError } = await supabase
      .from('bookings')
      .select('id, user_id, start_time, end_time, expires_at, status')
      .eq('status', 'pending_payment')
      .lt('expires_at', now);

    if (fetchError) {
      console.error('Error fetching pending bookings:', fetchError);
    } else {
      console.log(`Found ${pendingBookings?.length || 0} pending bookings that should be expired`);
      
      if (pendingBookings && pendingBookings.length > 0) {
        // Delete these manually as a backup
        const { error: manualDeleteError } = await supabase
          .from('bookings')
          .delete()
          .eq('status', 'pending_payment')
          .lt('expires_at', now);

        if (manualDeleteError) {
          console.error('Error in manual cleanup:', manualDeleteError);
        } else {
          console.log(`Manual cleanup removed ${pendingBookings.length} additional expired bookings`);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Cleanup completed successfully',
        deletedByFunction: deletedCount,
        deletedManually: pendingBookings?.length || 0,
        totalDeleted: deletedCount + (pendingBookings?.length || 0),
        timestamp: now
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in cleanup function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});