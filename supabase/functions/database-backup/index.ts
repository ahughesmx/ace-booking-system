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

// Orden de restauración respetando llaves foráneas
const RESTORE_ORDER = [
  "available_court_types",
  "courts",
  "court_type_settings",
  "booking_rules",
  "booking_reminder_settings",
  "match_management_settings",
  "payment_settings",
  "payment_gateways",
  "display_settings",
  "interface_preferences",
  "webhooks",
  "valid_member_ids",
  "profiles",
  "user_roles",
  "instructors",
  "courses",
  "court_maintenance",
  "bookings",
  "affected_bookings",
  "receipt_numbers",
  "special_bookings",
  "classes",
  "course_enrollments",
  "class_attendance",
  "course_notifications",
  "matches",
  "match_invitations",
  "rankings",
  "payment_verification_logs",
  "security_audit_log",
  "failed_login_attempts",
  "user_registration_requests",
];

// Columnas que son arreglos nativos de Postgres (no jsonb)
const ARRAY_COLUMNS = new Set([
  "specialties",
  "certifications",
  "operating_days",
  "recurrence_pattern",
]);

function quote(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

function toSqlValue(column: string, value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) {
    if (ARRAY_COLUMNS.has(column)) {
      const items = value.map((v) => `"${String(v).replace(/(["\\])/g, "\\$1")}"`).join(",");
      return `${quote(`{${items}}`)}`;
    }
    return `${quote(JSON.stringify(value))}::jsonb`;
  }
  if (typeof value === "object") return `${quote(JSON.stringify(value))}::jsonb`;
  return quote(String(value));
}

function buildSqlDump(backup: Record<string, unknown[]>, meta: Record<string, unknown>) {
  const lines: string[] = [];

  lines.push("-- ============================================================");
  lines.push("-- RESPALDO RESTAURABLE - Club de Vela / Sistema de Reservas");
  lines.push(`-- Generado: ${meta.generated_at}`);
  lines.push(`-- Proyecto: ${meta.project_ref}`);
  lines.push(`-- Registros: ${meta.total_records}`);
  lines.push("--");
  lines.push("-- INSTRUCCIONES:");
  lines.push("-- 1. Abre el SQL Editor de Supabase del proyecto destino.");
  lines.push("-- 2. Asegúrate de que el esquema (tablas, triggers, RLS) ya exista.");
  lines.push("-- 3. Pega este archivo completo y ejecútalo.");
  lines.push("-- Los registros existentes NO se sobrescriben (ON CONFLICT DO NOTHING).");
  lines.push("-- ============================================================");
  lines.push("");
  lines.push("BEGIN;");
  lines.push("SET session_replication_role = replica; -- desactiva triggers de validación");
  lines.push("");

  for (const table of RESTORE_ORDER) {
    const rows = backup[table] ?? [];
    lines.push(`-- ---------- ${table} (${rows.length} registros) ----------`);
    if (rows.length === 0) {
      lines.push("");
      continue;
    }

    const columns = Object.keys(rows[0] as Record<string, unknown>);
    const colList = columns.map((c) => `"${c}"`).join(", ");

    for (let i = 0; i < rows.length; i += 100) {
      const chunk = rows.slice(i, i + 100) as Record<string, unknown>[];
      const values = chunk
        .map((row) => `  (${columns.map((c) => toSqlValue(c, row[c])).join(", ")})`)
        .join(",\n");
      lines.push(`INSERT INTO public."${table}" (${colList}) VALUES`);
      lines.push(values);
      lines.push("ON CONFLICT DO NOTHING;");
    }
    lines.push("");
  }

  lines.push("SET session_replication_role = DEFAULT;");
  lines.push("COMMIT;");
  lines.push("");
  lines.push("-- ============================================================");
  lines.push("-- NOTA: las cuentas de acceso (auth.users) no se pueden insertar");
  lines.push("-- por SQL. Restáuralas con el archivo JSON y la API de administración");
  lines.push("-- de Supabase, o vuelve a invitar a los usuarios por correo.");
  lines.push("-- ============================================================");

  return lines.join("\n");
}

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
    const url = new URL(req.url);
    let format = url.searchParams.get("format") ?? "json";
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body?.format) format = body.format;
      } catch (_) { /* sin body */ }
    }

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

    console.log(`🗄️ Backup (${format}) solicitado por ${user.id}`);

    const backup: Record<string, unknown> = {};
    const summary: Record<string, number> = {};

    for (const table of TABLES) {
      const rows = await dumpTable(table);
      backup[table] = rows;
      summary[table] = rows.length;
    }

    const metadata = {
        generated_at: new Date().toISOString(),
        generated_by: user.id,
        project_ref: (Deno.env.get("SUPABASE_URL") ?? "").split("//")[1]?.split(".")[0] ?? null,
        format_version: 1,
        tables: summary as Record<string, number>,
        total_records: Object.values(summary).reduce((a, b) => a + b, 0),
    };

    if (format === "sql") {
      const sql = buildSqlDump(backup as Record<string, unknown[]>, metadata);
      console.log("✅ Dump SQL generado:", metadata.total_records, "registros");
      return new Response(JSON.stringify({ metadata, sql }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const authUsers = await dumpAuthUsers();
    (backup as Record<string, unknown>)["auth_users"] = authUsers;
    metadata.tables["auth_users"] = authUsers.length;
    metadata.total_records += authUsers.length;

    const payload = {
      metadata,
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