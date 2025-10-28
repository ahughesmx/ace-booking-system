import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the Auth context of the logged in user.
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Get the session or user object
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data } = await supabaseClient.auth.getUser(token)
    const user = data.user

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if user is admin or supervisor
    const { data: userRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!userRole || !['admin', 'supervisor'].includes(userRole.role)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create admin client using service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get all profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, member_id, phone, is_active')

    if (profilesError) {
      throw profilesError
    }

    // Get all user roles
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, role')

    if (rolesError) {
      throw rolesError
    }

    // Get ALL auth users using explicit pagination
    let allAuthUsers = []
    let page = 1
    let hasMore = true

    console.log('🔄 Starting to fetch all auth users with pagination...')

    while (hasMore) {
      const { data: authUsersResponse, error: authError } = await supabaseAdmin.auth.admin.listUsers({
        page: page,
        perPage: 1000
      })

      if (authError) {
        console.error(`❌ Error fetching auth users page ${page}:`, authError)
        throw authError
      }

      const users = authUsersResponse.users || []
      allAuthUsers = allAuthUsers.concat(users)
      
      console.log(`✅ Fetched page ${page}: ${users.length} users (Total: ${allAuthUsers.length})`)
      
      // If we got less than 1000, we've reached the end
      if (users.length < 1000) {
        hasMore = false
        console.log(`🏁 Finished! Total auth users retrieved: ${allAuthUsers.length}`)
      } else {
        page++
      }
    }

    const authUsers = allAuthUsers

    // Combine all data
    const usersWithRoles = profiles.map((profile) => {
      const authUser = authUsers.find((u) => u.id === profile.id)
      const userRole = roles.find((r) => r.user_id === profile.id)
      
      return {
        id: profile.id,
        full_name: profile.full_name,
        member_id: profile.member_id,
        phone: profile.phone,
        role: userRole?.role || 'user',
        email: authUser?.email || null,
        is_active: profile.is_active !== false,
      }
    })

    return new Response(
      JSON.stringify({ users: usersWithRoles }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in get-users-with-auth function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})