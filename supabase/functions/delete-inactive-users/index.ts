import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DeleteResult {
  user_id: string;
  success: boolean;
  reason?: string;
  details?: {
    profile_deleted: boolean;
    auth_deleted: boolean;
    registration_deleted: boolean;
    relations_cleaned: boolean;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the Auth context of the logged in user
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

    // Check if user is admin
    const { data: userRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!userRole || userRole.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Only admins can delete users' }),
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

    // Get user IDs to delete from request body
    const { user_ids } = await req.json()
    
    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid user_ids array' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`🗑️ Starting deletion process for ${user_ids.length} users`)

    const results: DeleteResult[] = []

    for (const userId of user_ids) {
      console.log(`\n📋 Processing user: ${userId}`)
      
      try {
        // 1. Get user profile
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('id, full_name, phone, is_active')
          .eq('id', userId)
          .single()

        if (profileError || !profile) {
          results.push({
            user_id: userId,
            success: false,
            reason: 'User profile not found'
          })
          continue
        }

        // 2. Validate user is inactive
        if (profile.is_active) {
          results.push({
            user_id: userId,
            success: false,
            reason: 'User is still active. Only inactive users can be deleted.'
          })
          continue
        }

        // 3. Check for active bookings
        const { count: bookingsCount } = await supabaseAdmin
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)

        if (bookingsCount && bookingsCount > 0) {
          results.push({
            user_id: userId,
            success: false,
            reason: `User has ${bookingsCount} bookings. Cannot delete.`
          })
          continue
        }

        // 4. Check for matches
        const { count: matchesCount } = await supabaseAdmin
          .from('matches')
          .select('id', { count: 'exact', head: true })
          .or(`player1_id.eq.${userId},player2_id.eq.${userId},player1_partner_id.eq.${userId},player2_partner_id.eq.${userId}`)

        if (matchesCount && matchesCount > 0) {
          results.push({
            user_id: userId,
            success: false,
            reason: `User has ${matchesCount} matches. Cannot delete.`
          })
          continue
        }

        // 5. Check for active course enrollments
        const { count: enrollmentsCount } = await supabaseAdmin
          .from('course_enrollments')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'active')

        if (enrollmentsCount && enrollmentsCount > 0) {
          results.push({
            user_id: userId,
            success: false,
            reason: `User has ${enrollmentsCount} active course enrollments. Cannot delete.`
          })
          continue
        }

        // 6. Check if user is an instructor
        const { count: instructorCount } = await supabaseAdmin
          .from('instructors')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)

        if (instructorCount && instructorCount > 0) {
          results.push({
            user_id: userId,
            success: false,
            reason: 'User is an instructor. Cannot delete.'
          })
          continue
        }

        // 7. Check for court maintenance created by user
        const { count: maintenanceCount } = await supabaseAdmin
          .from('court_maintenance')
          .select('id', { count: 'exact', head: true })
          .eq('created_by', userId)

        if (maintenanceCount && maintenanceCount > 0) {
          results.push({
            user_id: userId,
            success: false,
            reason: `User has created ${maintenanceCount} maintenance entries. Cannot delete.`
          })
          continue
        }

        console.log(`✅ All validations passed for user ${userId}`)
        console.log(`🧹 Starting deletion process...`)

        // ALL VALIDATIONS PASSED - START DELETION PROCESS
        
        // STEP 1: SET NULL in references
        console.log(`  → Setting NULL references...`)
        await supabaseAdmin
          .from('profiles')
          .update({ deactivated_by: null })
          .eq('deactivated_by', userId)

        await supabaseAdmin
          .from('special_bookings')
          .update({ reference_user_id: null })
          .eq('reference_user_id', userId)

        // STEP 2: DELETE related tables
        console.log(`  → Deleting user_roles...`)
        await supabaseAdmin.from('user_roles').delete().eq('user_id', userId)
        
        console.log(`  → Deleting rankings...`)
        await supabaseAdmin.from('rankings').delete().eq('user_id', userId)
        
        console.log(`  → Deleting course_enrollments...`)
        await supabaseAdmin.from('course_enrollments').delete().eq('user_id', userId)
        
        console.log(`  → Deleting course_notifications...`)
        await supabaseAdmin.from('course_notifications').delete().eq('user_id', userId)
        
        console.log(`  → Deleting class_attendance...`)
        await supabaseAdmin.from('class_attendance').delete().eq('user_id', userId)
        
        console.log(`  → Deleting match_invitations...`)
        await supabaseAdmin.from('match_invitations').delete()
          .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)

        // STEP 3: DELETE individual registration request
        console.log(`  → Deleting registration request...`)
        let registrationDeleted = false
        
        if (profile.phone) {
          const { data: requests } = await supabaseAdmin
            .from('user_registration_requests')
            .select('id, processed_at')
            .eq('phone', profile.phone)
            .eq('status', 'approved')
            .order('processed_at', { ascending: false })
            .limit(1)

          if (requests && requests.length > 0) {
            const { error: deleteRequestError } = await supabaseAdmin
              .from('user_registration_requests')
              .delete()
              .eq('id', requests[0].id)
            
            if (!deleteRequestError) {
              registrationDeleted = true
              console.log(`  ✓ Registration request deleted`)
            }
          }
        }

        // STEP 4: DELETE profile
        console.log(`  → Deleting profile...`)
        const { error: deleteProfileError } = await supabaseAdmin
          .from('profiles')
          .delete()
          .eq('id', userId)

        if (deleteProfileError) {
          throw new Error(`Failed to delete profile: ${deleteProfileError.message}`)
        }

        // STEP 5: DELETE from auth.users
        console.log(`  → Deleting auth user...`)
        const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId)

        if (deleteAuthError) {
          console.error(`⚠️ Warning: Failed to delete auth user: ${deleteAuthError.message}`)
        }

        console.log(`✅ Successfully deleted user ${userId} (${profile.full_name})`)

        results.push({
          user_id: userId,
          success: true,
          details: {
            profile_deleted: true,
            auth_deleted: !deleteAuthError,
            registration_deleted: registrationDeleted,
            relations_cleaned: true
          }
        })

      } catch (error) {
        console.error(`❌ Error deleting user ${userId}:`, error)
        results.push({
          user_id: userId,
          success: false,
          reason: error.message
        })
      }
    }

    // Prepare summary
    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    console.log(`\n📊 Deletion Summary: ${successful} successful, ${failed} failed`)

    return new Response(
      JSON.stringify({
        success: true,
        results,
        summary: {
          total_requested: user_ids.length,
          successfully_deleted: successful,
          failed: failed
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Error in delete-inactive-users function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
