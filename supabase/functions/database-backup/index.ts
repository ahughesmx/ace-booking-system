import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";
import { corsHeaders } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// Todas las tablas del esquema public
const TABLES = [
  "affected_bookings",
  "available_court_types",
  "booking_reminder_settings",
  "booking_rules",
  "bookings",
  "class_attendance",
  "classes",
  "course_enrollments",
  "course_notifications",
  "courses",
  "court_maintenance",
  "court_type_settings",
  "courts",
  "display_settings",
  "failed_login_attempts",
  "instructors",
  "interface_preferences",
  "match_invitations",
  "match_management_settings",
  "matches",
  "payment_gateways",
  "payment_settings",
  "payment_verification_logs",
  "profiles",
  "rankings",
  "receipt_numbers",
  "security_audit_log",
  "special_bookings",
  "user_registration_requests",
  "user_roles",
  "valid_member_ids",
  "webhooks",
];

const PAGE_SIZE = 1000;

async function dumpTable(table: string) {
  const rows: unknown[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Error exportando ${table}: ${error.message}`);
    }

    rows.push(...(data ?? []));

    if (!data || data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

async function dumpAuthUsers() {
  const users: unknown[] = [];
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`Error exportando usuarios: ${error.message}`);

    users.push(
      ...data.users.map((u) => ({
        id: u.id,
        email: u.email,
        phone: u.phone,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        email_confirmed_at: u.email_confirmed_at,
        user_metadata: u.user_metadata,
      }))
    );

    if (data.users.length < 1000) break;
    page += 1;
  }

  return users;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No autorizado");

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) throw new Error("No autorizado");

    // Solo administradores
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (userRole?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Solo los administradores pueden generar respaldos" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`🗄️ Backup solicitado por ${user.id}`);

    const backup: Record<string, unknown> = {};
    const summary: Record<string, number> = {};

    for (const table of TABLES) {
      const rows = await dumpTable(table);
      backup[table] = rows;
      summary[table] = rows.length;
    }

    const authUsers = await dumpAuthUsers();
    backup["auth_users"] = authUsers;
    summary["auth_users"] = authUsers.length;

    const payload = {
      metadata: {
        generated_at: new Date().toISOString(),
        generated_by: user.id,
        project_ref: (Deno.env.get("SUPABASE_URL") ?? "").split("//")[1]?.split(".")[0] ?? null,
        format_version: 1,
        tables: summary,
        total_records: Object.values(summary).reduce((a, b) => a + b, 0),
      },
      data: backup,
    };

    console.log("✅ Backup generado:", payload.metadata.total_records, "registros");

    return new Response(JSON.stringify(payload), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("❌ Error generando respaldo:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});