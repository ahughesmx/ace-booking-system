import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      console.error("[create-registration-request] Missing Supabase env vars");
      return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => ({}));
    const rawMemberId: unknown = (body as any)?.memberId;
    const rawFullName: unknown = (body as any)?.fullName;
    const rawPhone: unknown = (body as any)?.phone;
    const rawEmail: unknown = (body as any)?.email;

    // Basic validation + sanitize
    const member_id = typeof rawMemberId === "string" ? rawMemberId.trim() : "";
    const full_name = typeof rawFullName === "string" ? rawFullName.trim() : "";
    const phone = typeof rawPhone === "string" ? rawPhone.trim() : "";
    const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";

    console.log("[create-registration-request] Payload:", { member_id, full_name, phone, email });

    if (!member_id || !full_name || !phone || !email) {
      return new Response(JSON.stringify({ error: "Todos los campos son obligatorios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (phone.length !== 10) {
      return new Response(JSON.stringify({ error: "El celular debe tener exactamente 10 dígitos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Optional: re-validate member id on server for extra safety
    const { data: validMember, error: validateError } = await supabase
      .from("valid_member_ids")
      .select("member_id")
      .eq("member_id", member_id)
      .maybeSingle();

    console.log("[create-registration-request] Member validation:", { validMember, validateError });

    if (validateError || !validMember) {
      return new Response(JSON.stringify({ error: `Clave de socio "${member_id}" inválida` }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for existing pending requests with same phone OR email
    console.log("[create-registration-request] Checking for duplicate pending requests:", { phone, email });
    const { data: existingPending, error: checkError } = await supabase
      .from("user_registration_requests")
      .select("id, phone, email, full_name")
      .eq("status", "pending")
      .or(`phone.eq.${phone},email.eq.${email}`)
      .limit(1)
      .maybeSingle();

    console.log("[create-registration-request] Duplicate check result:", { existingPending, checkError });

    if (existingPending && !checkError) {
      let reason = "";
      if (existingPending.phone === phone && existingPending.email === email) {
        reason = `el teléfono ${phone} y el correo ${email}`;
      } else if (existingPending.phone === phone) {
        reason = `el teléfono ${phone}`;
      } else if (existingPending.email === email) {
        reason = `el correo ${email}`;
      }
      
      return new Response(
        JSON.stringify({ 
          error: `Ya existe una solicitud pendiente de aprobación con ${reason}. No es necesario realizar un nuevo registro.`,
          duplicate: true
        }), 
        { 
          status: 409, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Insert request
    const { error: insertError } = await supabase
      .from("user_registration_requests")
      .insert({
        member_id,
        full_name,
        phone,
        email,
        status: "pending",
        send_password_reset: true,
      });

    console.log("[create-registration-request] Insert result:", { insertError });

    if (insertError) {
      return new Response(
        JSON.stringify({ error: `Error al enviar solicitud: ${insertError.message}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[create-registration-request] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});