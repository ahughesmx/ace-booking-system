import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LogFilters {
  startDate?: string;
  endDate?: string;
  function?: string;
  status?: string;
  search?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("📊 GET-PAYMENT-LOGS: Starting request");

    // Get Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) {
      return new Response(JSON.stringify({ error: "Usuario no autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create service role client for checking admin role
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Check if user is admin
    const { data: userRole } = await supabaseService
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!userRole || userRole.role !== "admin") {
      return new Response(JSON.stringify({ error: "Se requiere acceso de administrador" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body for filters
    const { filters } = await req.json() as { filters: LogFilters };
    console.log("🔍 GET-PAYMENT-LOGS: Filters received:", filters);

    // Calculate date range (default: last 24 hours)
    const endDate = filters?.endDate 
      ? new Date(filters.endDate + 'T23:59:59.999Z')
      : new Date();
    const startDate = filters?.startDate 
      ? new Date(filters.startDate + 'T00:00:00.000Z')
      : new Date(endDate.getTime() - 24 * 60 * 60 * 1000);

    console.log("📅 GET-PAYMENT-LOGS: Date range:", {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });

    // Build query
    let query = supabaseService
      .from("payment_verification_logs")
      .select("*")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .order("created_at", { ascending: false });

    // Apply function filter
    if (filters?.function) {
      query = query.eq("function_name", filters.function);
    }

    // Apply status filter
    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    // Apply search filter (search in session_id or booking_id)
    if (filters?.search) {
      query = query.or(`session_id.ilike.%${filters.search}%,booking_id.eq.${filters.search}`);
    }

    // Execute query
    const { data: logsData, error: logsError } = await query;

    if (logsError) {
      console.error("❌ GET-PAYMENT-LOGS: Error fetching logs:", logsError);
      throw logsError;
    }

    console.log(`📦 GET-PAYMENT-LOGS: Found ${logsData?.length || 0} log entries`);

    // Transform logs to match frontend interface
    const logs = (logsData || []).map((log: any) => ({
      timestamp: log.created_at,
      function: log.function_name,
      sessionId: log.session_id,
      bookingId: log.booking_id,
      status: log.status,
      duration: log.duration_ms,
      errorMessage: log.error_message,
      metadata: {
        userId: log.user_id,
        amount: log.amount,
        paymentStatus: log.payment_status,
        ...log.metadata
      }
    }));

    // Calculate summary
    const summary = {
      totalVerifications: logs.length,
      successful: logs.filter((l: any) => l.status === "success").length,
      failed: logs.filter((l: any) => l.status === "error").length,
      notFound: logs.filter((l: any) => l.status === "not_found").length,
      avgDuration: logs.length > 0 && logs.filter((l: any) => l.duration).length > 0
        ? Math.round(logs.filter((l: any) => l.duration).reduce((sum: number, l: any) => sum + (l.duration || 0), 0) / logs.filter((l: any) => l.duration).length)
        : 0
    };

    console.log("✅ GET-PAYMENT-LOGS: Successfully processed logs:", {
      totalLogs: logs.length,
      summary
    });

    return new Response(
      JSON.stringify({
        logs,
        summary
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error("❌ GET-PAYMENT-LOGS: Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Error interno del servidor",
        details: error.toString()
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
