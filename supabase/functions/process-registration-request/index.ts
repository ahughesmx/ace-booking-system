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
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("🚀 Process registration request called");
  console.log("Method:", req.method);
  console.log("Headers:", Object.fromEntries(req.headers.entries()));
  
  // Leer el cuerpo de la petición directamente como JSON
  let body: ProcessRequestBody;
  try {
    body = await req.json();
    console.log("📝 Request body:", JSON.stringify(body, null, 2));
  } catch (error) {
    console.error("❌ Error parsing JSON body:", error);
    return new Response(
      JSON.stringify({ error: "Invalid JSON body format" }),
      { 
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("❌ No authorization header");
      throw new Error("No authorization header");
    }

    console.log("🔐 Authorization header found:", authHeader.substring(0, 20) + "...");

    // Verificar autenticación del usuario
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      console.error("❌ Auth error:", authError);
      throw new Error("Unauthorized");
    }

    console.log("✅ User authenticated:", user.id);

    // Verificar que el usuario sea admin u operador
    const { data: userRole, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError) {
      console.error("❌ Role query error:", roleError);
    }

    if (!userRole || !['admin', 'operador'].includes(userRole.role)) {
      console.error("❌ Insufficient permissions. User role:", userRole?.role);
      throw new Error("Insufficient permissions");
    }

    console.log("✅ User has sufficient permissions:", userRole.role);

    // Validar campos requeridos
    const { requestId, action, rejectionReason } = body;
    if (!requestId || !action) {
      throw new Error("Missing required fields: requestId and action are required");
    }
    
    if (!['approve', 'reject'].includes(action)) {
      throw new Error("Invalid action. Must be 'approve' or 'reject'");
    }

    if (action === 'approve') {
      console.log("🟢 Processing approval for request:", requestId);
      
      // Obtener los datos de la solicitud
      const { data: request, error: requestError } = await supabase
        .from("user_registration_requests")
        .select("*")
        .eq("id", requestId)
        .eq("status", "pending")
        .single();

      if (requestError || !request) {
        console.error("❌ Request not found or already processed:", requestError);
        throw new Error("Request not found or already processed");
      }

      console.log("📋 Request data:", { 
        full_name: request.full_name, 
        email: request.email, 
        member_id: request.member_id,
        phone: request.phone 
      });

      // Validar que exista el teléfono
      if (!request.phone || request.phone.trim() === '') {
        console.error("❌ Phone is required but missing");
        throw new Error("El teléfono es requerido para aprobar la solicitud");
      }

      // Limpiar el teléfono de espacios
      const cleanPhone = request.phone.replace(/\s/g, '');
      
      // Validar que solo contenga números
      if (!/^\d+$/.test(cleanPhone)) {
        console.error("❌ Phone contains invalid characters:", request.phone);
        throw new Error("El teléfono debe contener solo números, sin espacios, guiones o caracteres especiales");
      }

      // Validar que tenga exactamente 10 dígitos
      if (cleanPhone.length !== 10) {
        console.error("❌ Phone has invalid length:", cleanPhone.length);
        throw new Error(`El teléfono debe tener exactamente 10 dígitos. El teléfono actual tiene ${cleanPhone.length} dígitos`);
      }

      console.log("✅ Phone validation passed:", cleanPhone);

      // Cuando un admin/operador aprueba, solo verificar que el member_id sea válido
      // Sin restricciones de familia (los admins pueden asignar cualquier member_id válido)
      const { data: validMemberId, error: memberIdError } = await supabase
        .from('valid_member_ids')
        .select('member_id')
        .eq('member_id', request.member_id)
        .maybeSingle();

      if (memberIdError) {
        console.error("❌ Error validating member_id:", memberIdError);
        throw new Error("Error validando clave de socio");
      }

      if (!validMemberId) {
        console.error("❌ Member ID not found in valid list:", request.member_id);
        throw new Error("Esta clave de socio no está en la lista de claves válidas");
      }

      console.log("✅ Member ID validation passed for:", request.member_id);

      // SIEMPRE crear un nuevo usuario - NUNCA reutilizar usuarios existentes
      // Cada persona debe tener su propia cuenta, incluso si son de la misma familia
      const phoneE164 = `521${cleanPhone}`;
      
      // Crear usuario con la contraseña de la solicitud o una temporal si no se proporcionó
      const userPassword = request.password && request.password.trim() 
        ? request.password 
        : crypto.randomUUID() + "!Secure" + Math.random().toString(36);
      
      console.log(`🔑 Creating new user with ${request.password ? 'provided' : 'generated'} password`);
      
      // Construir payload según tengamos email o no
      const createPayload: any = {
        password: userPassword,
        user_metadata: {
          member_id: request.member_id,
          full_name: request.full_name,
          phone: cleanPhone
        }
      };

      if (request.email) {
        createPayload.email = request.email;
        createPayload.email_confirm = true;
      } else {
        createPayload.phone = phoneE164;
        createPayload.phone_confirm = true;
      }
      
      const { data: authData, error: createUserError } = await supabase.auth.admin.createUser(createPayload);

      if (createUserError) {
        // Si el error es por email/teléfono duplicado, dar un mensaje claro
        if (createUserError.message.includes('already registered') || 
            createUserError.message.includes('duplicate') ||
            createUserError.message.includes('already exists')) {
          throw new Error(`Ya existe un usuario con este ${request.email ? 'correo electrónico' : 'teléfono'}. Cada miembro de la familia debe tener su propio correo/teléfono único.`);
        }
        throw new Error(`Error al crear usuario: ${createUserError.message}`);
      }

      console.log(`✅ New user created successfully for ${request.full_name}`);

      // Enviar email de recuperación solo si hay email y NO se proporcionó password
      // (Si se proporcionó password, el usuario ya lo conoce)
      if (request.email && !request.password && request.send_password_reset !== false) {
        const { error: resetError } = await supabase.auth.admin.generateLink({
          type: 'recovery',
          email: request.email,
          options: {
            redirectTo: `${Deno.env.get("SUPABASE_URL")?.replace('/rest/v1', '')}/auth/callback`
          }
        });

        if (resetError) {
          console.error("Error sending password reset email:", resetError);
        } else {
          console.log("✅ Password reset email sent to:", request.email);
        }
      }

      // Usar upsert para crear o actualizar el perfil con los datos completos
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: authData.user.id,
          member_id: request.member_id,
          full_name: request.full_name,
          phone: cleanPhone,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (profileError) {
        console.error("Error upserting profile:", profileError);
        // Solo intentar eliminar el usuario si lo acabamos de crear
        if (!existingUser) {
          await supabase.auth.admin.deleteUser(authData.user.id);
        }
        throw new Error("Failed to create/update user profile");
      }

      console.log(`Profile upserted successfully for user ${authData.user.id} with complete information`);

      // Asignar rol de "user" por defecto si no existe
      const { error: roleError } = await supabase
        .from("user_roles")
        .upsert({
          user_id: authData.user.id,
          role: 'user'
        }, {
          onConflict: 'user_id'
        });

      if (roleError) {
        console.error("Error assigning user role:", roleError);
        // No fallar por esto, pero loguear el error
      } else {
        console.log(`User role assigned successfully for user ${authData.user.id}`);
      }

      // Actualizar la solicitud como aprobada y limpiar el password
      const { error: updateError } = await supabase
        .from("user_registration_requests")
        .update({
          status: "approved",
          processed_by: user.id,
          processed_at: new Date().toISOString(),
          password: null // Limpiar password después de crear el usuario
        })
        .eq("id", requestId);

      if (updateError) {
        console.error("Error updating request:", updateError);
      }

      // Enviar webhook de cambio de estatus
      const { data: webhooks } = await supabase
        .from("webhooks")
        .select("*")
        .eq("event_type", "registration_status_changed")
        .eq("is_active", true);

      for (const webhook of webhooks || []) {
        try {
          const webhookData = {
            event: "registration_status_changed",
            timestamp: new Date().toISOString(),
            data: {
              request_id: requestId,
              status: "approved",
              full_name: request.full_name,
              email: request.email,
              phone: cleanPhone,
              member_id: request.member_id,
              remotejid: cleanPhone,
              user_id: authData.user.id,
              processed_by: user.id,
              rejection_reason: null
            },
            webhook_name: webhook.name
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

      console.log("✅ User approval process completed successfully");
      
      return new Response(
        JSON.stringify({ 
          message: "User approved and created successfully",
          user_id: authData.user.id,
          full_name: request.full_name 
        }),
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

      // Enviar webhook de cambio de estatus
      const { data: webhooks } = await supabase
        .from("webhooks")
        .select("*")
        .eq("event_type", "registration_status_changed")
        .eq("is_active", true);

      for (const webhook of webhooks || []) {
        try {
          const webhookData = {
            event: "registration_status_changed",
            timestamp: new Date().toISOString(),
            data: {
              request_id: requestId,
              status: "rejected",
              full_name: request.full_name,
              email: request.email,
              phone: request.phone,
              member_id: request.member_id,
              remotejid: request.phone,
              user_id: null,
              processed_by: user.id,
              rejection_reason: rejectionReason
            },
            webhook_name: webhook.name
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