import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";
import { corsHeaders } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

interface CreateUserRequest {
  email: string;
  password: string;
  full_name: string;
  member_id: string;
  phone?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("🚀 Manual user creation called");

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Verificar autenticación del usuario
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Verificar que el usuario sea admin u operador
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!userRole || !['admin', 'operador'].includes(userRole.role)) {
      throw new Error("Insufficient permissions");
    }

    const body: CreateUserRequest = await req.json();
    const { email, password, full_name, member_id, phone } = body;

    console.log("📝 Creating user:", { email, full_name, member_id });

    // 1. Verificar si ya existe un usuario con este email
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers.users.find(u => u.email === email);

    if (existingUser) {
      throw new Error("Ya existe un usuario con este correo electrónico");
    }

    // 2. Verificar member_id duplicado
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("member_id")
      .eq("member_id", member_id)
      .single();

    if (existingProfile) {
      throw new Error("Ya existe un usuario con esta clave de socio");
    }

    // 3. Crear usuario en auth
    const { data: authData, error: createUserError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        member_id,
        full_name,
        phone
      }
    });

    if (createUserError) {
      throw new Error(`Error creando usuario: ${createUserError.message}`);
    }

    console.log("✅ Auth user created:", authData.user.id);

    try {
      // 4. Crear perfil
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: authData.user.id,
          member_id,
          full_name,
          phone
        });

      if (profileError) {
        console.error("❌ Error creating profile:", profileError);
        // Rollback: eliminar usuario de auth
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw new Error(`Error creando perfil: ${profileError.message}`);
      }

      // 5. Asignar rol de usuario
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: authData.user.id,
          role: 'user'
        });

      if (roleError) {
        console.error("❌ Error creating role:", roleError);
        // No hacer rollback por esto, solo logear
      }

      console.log("✅ User created successfully:", authData.user.id);

      return new Response(
        JSON.stringify({ 
          success: true,
          user_id: authData.user.id,
          email,
          full_name,
          member_id
        }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );

    } catch (error) {
      // Rollback en caso de error
      try {
        await supabase.auth.admin.deleteUser(authData.user.id);
      } catch (rollbackError) {
        console.error("❌ Error during rollback:", rollbackError);
      }
      throw error;
    }

  } catch (error) {
    console.error("❌ Error in manual user creation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  }
});