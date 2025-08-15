import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Obtener el service role key para operaciones administrativas
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    
    if (!supabaseServiceRoleKey || !supabaseUrl) {
      throw new Error('Missing Supabase configuration');
    }

    // Crear cliente con service role key para operaciones administrativas
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('Creating Rodrigo Baldomar user...');

    // Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: 'rbaldomar@gmail.com',
      password: 'Abc12345',
      email_confirm: true,
      user_metadata: {
        full_name: 'Rodrigo Baldomar',
        member_id: '422',
        phone: '2299152465'
      }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      throw authError;
    }

    console.log('Auth user created:', authData.user?.id);

    // Crear perfil
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user!.id,
        full_name: 'Rodrigo Baldomar',
        member_id: '422',
        phone: '2299152465'
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      // Si falla el perfil, eliminar el usuario de auth
      await supabaseAdmin.auth.admin.deleteUser(authData.user!.id);
      throw profileError;
    }

    console.log('Profile created successfully');

    // Asignar rol de usuario
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: authData.user!.id,
        role: 'user'
      });

    if (roleError) {
      console.error('Error creating role:', roleError);
      // Si falla el rol, eliminar usuario y perfil
      await supabaseAdmin.auth.admin.deleteUser(authData.user!.id);
      throw roleError;
    }

    console.log('User role assigned successfully');

    // Marcar la solicitud de registro como procesada
    const { error: requestError } = await supabaseAdmin
      .from('user_registration_requests')
      .update({
        status: 'approved',
        processed_at: new Date().toISOString()
      })
      .eq('email', 'rbaldomar@gmail.com')
      .eq('status', 'approved');

    if (requestError) {
      console.warn('Warning: Could not update registration request:', requestError);
      // No fallar por esto, el usuario ya está creado
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Usuario Rodrigo Baldomar creado exitosamente',
      user_id: authData.user!.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in create-rodrigo-user function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});