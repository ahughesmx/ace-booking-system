import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";
import { corsHeaders } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

interface ProcessRequestBody {
  requestId: string;
  action: 'approve' | 'reject';
  rejectionReason?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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

    const body: ProcessRequestBody = await req.json();
    const { requestId, action, rejectionReason } = body;

    if (action === 'approve') {
      // Obtener los datos de la solicitud
      const { data: request, error: requestError } = await supabase
        .from("user_registration_requests")
        .select("*")
        .eq("id", requestId)
        .eq("status", "pending")
        .single();

      if (requestError || !request) {
        throw new Error("Request not found or already processed");
      }

      // Verificar si ya existe un usuario con este email usando listUsers
      const { data: existingUsers, error: userCheckError } = await supabase.auth.admin.listUsers();
      
      if (userCheckError) {
        throw new Error(`Error checking existing users: ${userCheckError.message}`);
      }

      const existingUser = existingUsers.users.find(u => u.email === request.email);

      let authData;
      
      if (existingUser) {
        // El usuario ya existe, usar el existente
        authData = { user: existingUser };
        console.log(`User with email ${request.email} already exists, using existing user`);
      } else {
        // Crear nuevo usuario
        // Si la solicitud tiene contraseña, usarla; si no, generar una temporal
        const userPassword = request.password_provided && request.password 
          ? request.password 
          : crypto.randomUUID() + "!Temp123";
        
        const { data: newAuthData, error: createUserError } = await supabase.auth.admin.createUser({
          email: request.email,
          password: userPassword,
          email_confirm: true,
          user_metadata: {
            member_id: request.member_id,
            full_name: request.full_name,
            phone: request.phone
          }
        });

        if (createUserError) {
          throw new Error(`Failed to create user: ${createUserError.message}`);
        }

        authData = newAuthData;

        // Solo enviar email de reset si no se proporcionó contraseña
        if (!request.password_provided || !request.password) {
          const { error: resetError } = await supabase.auth.admin.generateLink({
            type: 'recovery',
            email: request.email,
            options: {
              redirectTo: `${Deno.env.get("SUPABASE_URL")?.replace('/rest/v1', '')}/auth/callback`
            }
          });

          if (resetError) {
            console.error("Error sending password reset email:", resetError);
          }
        }
      }

      // Verificar si ya existe un perfil para este usuario
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id, full_name, member_id, phone")
        .eq("id", authData.user.id)
        .single();

      if (!existingProfile) {
        // Crear el perfil del usuario si no existe
        const { error: profileError } = await supabase
          .from("profiles")
          .insert({
            id: authData.user.id,
            member_id: request.member_id,
            full_name: request.full_name,
            phone: request.phone
          });

        if (profileError) {
          console.error("Error creating profile:", profileError);
          // Solo intentar eliminar el usuario si lo acabamos de crear
          if (!existingUser) {
            await supabase.auth.admin.deleteUser(authData.user.id);
          }
          throw new Error("Failed to create user profile");
        }
      } else {
        // El perfil existe, pero verificar si necesita actualización
        const needsUpdate = !existingProfile.full_name || 
                           !existingProfile.member_id || 
                           !existingProfile.phone;
        
        if (needsUpdate) {
          const { error: updateError } = await supabase
            .from("profiles")
            .update({
              member_id: request.member_id,
              full_name: request.full_name,
              phone: request.phone,
              updated_at: new Date().toISOString()
            })
            .eq("id", authData.user.id);

          if (updateError) {
            console.error("Error updating profile:", updateError);
            throw new Error("Failed to update user profile");
          }
          
          console.log(`Profile updated for user ${authData.user.id} with complete information`);
        } else {
          console.log(`Profile already exists for user ${authData.user.id} with complete information`);
        }
      }

      // Actualizar la solicitud como aprobada
      const { error: updateError } = await supabase
        .from("user_registration_requests")
        .update({
          status: "approved",
          processed_by: user.id,
          processed_at: new Date().toISOString()
        })
        .eq("id", requestId);

      if (updateError) {
        console.error("Error updating request:", updateError);
      }

      // Enviar webhook de aprobación
      const { data: webhooks } = await supabase
        .from("webhooks")
        .select("*")
        .eq("event_type", "user_registration_approved")
        .eq("is_active", true);

      for (const webhook of webhooks || []) {
        try {
          const webhookData = {
            event: "user_registration_approved",
            timestamp: new Date().toISOString(),
            data: {
              user_id: authData.user.id,
              full_name: request.full_name,
              email: request.email,
              phone: request.phone,
              member_id: request.member_id,
              remotejid: request.phone,
              approved_by: user.id
            }
          };

          await fetch(webhook.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...webhook.headers || {}
            },
            body: JSON.stringify(webhookData)
          });
        } catch (error) {
          console.error(`Webhook error for ${webhook.name}:`, error);
        }
      }

      return new Response(
        JSON.stringify({ message: "User approved and created successfully" }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );

    } else if (action === 'reject') {
      if (!rejectionReason) {
        throw new Error("Rejection reason is required");
      }

      // Obtener los datos de la solicitud
      const { data: request, error: requestError } = await supabase
        .from("user_registration_requests")
        .select("*")
        .eq("id", requestId)
        .eq("status", "pending")
        .single();

      if (requestError || !request) {
        throw new Error("Request not found or already processed");
      }

      // Actualizar la solicitud como rechazada
      const { error: updateError } = await supabase
        .from("user_registration_requests")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason,
          processed_by: user.id,
          processed_at: new Date().toISOString()
        })
        .eq("id", requestId);

      if (updateError) {
        throw new Error("Failed to update request");
      }

      // Enviar webhook de rechazo
      const { data: webhooks } = await supabase
        .from("webhooks")
        .select("*")
        .eq("event_type", "user_registration_rejected")
        .eq("is_active", true);

      for (const webhook of webhooks || []) {
        try {
          const webhookData = {
            event: "user_registration_rejected",
            timestamp: new Date().toISOString(),
            data: {
              full_name: request.full_name,
              email: request.email,
              phone: request.phone,
              member_id: request.member_id,
              remotejid: request.phone,
              rejection_reason: rejectionReason,
              rejected_by: user.id
            }
          };

          await fetch(webhook.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...webhook.headers || {}
            },
            body: JSON.stringify(webhookData)
          });
        } catch (error) {
          console.error(`Webhook error for ${webhook.name}:`, error);
        }
      }

      return new Response(
        JSON.stringify({ message: "User request rejected successfully" }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    throw new Error("Invalid action");

  } catch (error) {
    console.error("Error processing registration request:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  }
});