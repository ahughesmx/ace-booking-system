import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { corsHeaders } from '../_shared/cors.ts'

console.log("Loading get-matches function...")

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log("Fetching matches...")
    const { data, error } = await supabase
      .from('matches')
      .select(`
        *,
        booking:bookings (
          start_time,
          court:courts (
            name
          )
        ),
        player1:profiles!matches_player1_id_fkey_profiles (
          full_name
        ),
        player2:profiles!matches_player2_id_fkey_profiles (
          full_name
        ),
        player1_partner:profiles!matches_player1_partner_id_fkey_profiles (
          full_name
        ),
        player2_partner:profiles!matches_player2_partner_id_fkey_profiles (
          full_name
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error("Error fetching matches:", error)
      throw error
    }

    console.log("Successfully fetched matches:", data?.length)
    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error("Error in get-matches function:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})