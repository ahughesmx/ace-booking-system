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
      console.error("Missing Supabase env vars for validate-member-id function");
      return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => ({}));
    const rawMemberId: unknown = (body as any)?.memberId;

    // Basic validation
    if (typeof rawMemberId !== "string") {
      return new Response(
        JSON.stringify({ valid: false, error: "memberId requerido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const memberId = rawMemberId.trim();
    if (!memberId) {
      return new Response(
        JSON.stringify({ valid: false, error: "memberId vacío" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[validate-member-id] Checking memberId:", JSON.stringify(memberId));

    const { data, error } = await supabase
      .from("valid_member_ids")
      .select("member_id")
      .eq("member_id", memberId)
      .maybeSingle();

    if (error) {
      console.error("[validate-member-id] Query error:", error);
      return new Response(
        JSON.stringify({ valid: false, error: error.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const valid = !!data;
    return new Response(
      JSON.stringify({ valid, memberId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[validate-member-id] Unexpected error:", err);
    return new Response(
      JSON.stringify({ valid: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});