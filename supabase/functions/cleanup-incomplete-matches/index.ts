import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10'
import { corsHeaders } from '../_shared/cors.ts'

console.log("Cleanup incomplete matches function is loading...")

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting cleanup process for incomplete matches");

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get cleanup settings
    const { data: settings, error: settingsError } = await supabase
      .from('match_management_settings')
      .select('*')
      .single();

    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
      throw settingsError;
    }

    if (!settings?.cleanup_enabled) {
      console.log('Cleanup is disabled, skipping...');
      return new Response(
        JSON.stringify({ 
          message: 'Cleanup is disabled',
          deleted: 0 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    console.log(`Cleanup settings: ${settings.cleanup_hours_after_booking} hours after booking end`);

    // Calculate cutoff time
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - settings.cleanup_hours_after_booking);
    const cutoffIso = cutoffTime.toISOString();

    console.log(`Looking for matches to cleanup before: ${cutoffIso}`);

    // Find incomplete matches that should be cleaned up
    // Singles: player2_id is null
    // Doubles: missing player1_partner_id or player2_partner_id
    const { data: matchesToDelete, error: fetchError } = await supabase
      .from('matches')
      .select(`
        id,
        player1_id,
        player2_id,
        player1_partner_id,
        player2_partner_id,
        is_doubles,
        booking:bookings!inner(
          id,
          end_time
        )
      `)
      .lt('booking.end_time', cutoffIso);

    if (fetchError) {
      console.error('Error fetching matches:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${matchesToDelete?.length || 0} potential matches to check`);

    // Filter matches that are actually incomplete
    const incompleteMatches = matchesToDelete?.filter(match => {
      // For singles matches (is_doubles = false or null)
      if (!match.is_doubles) {
        // Incomplete if player2_id is null
        return match.player2_id === null;
      } else {
        // For doubles matches (is_doubles = true)
        // Incomplete if missing any partner
        return match.player1_partner_id === null || match.player2_partner_id === null;
      }
    }) || [];

    console.log(`Found ${incompleteMatches.length} incomplete matches to delete`);

    let deletedCount = 0;

    // Delete incomplete matches
    for (const match of incompleteMatches) {
      console.log(`Deleting incomplete match: ${match.id}`);
      
      // First delete any related match invitations
      const { error: inviteDeleteError } = await supabase
        .from('match_invitations')
        .delete()
        .eq('match_id', match.id);

      if (inviteDeleteError) {
        console.error(`Error deleting invitations for match ${match.id}:`, inviteDeleteError);
        continue;
      }

      // Then delete the match
      const { error: matchDeleteError } = await supabase
        .from('matches')
        .delete()
        .eq('id', match.id);

      if (matchDeleteError) {
        console.error(`Error deleting match ${match.id}:`, matchDeleteError);
        continue;
      }

      deletedCount++;
      console.log(`Successfully deleted match: ${match.id}`);
    }

    console.log(`Cleanup completed. Deleted ${deletedCount} incomplete matches`);

    return new Response(
      JSON.stringify({ 
        message: 'Cleanup completed successfully',
        deleted: deletedCount,
        checked: matchesToDelete?.length || 0,
        cutoffTime: cutoffIso
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