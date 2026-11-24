import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Convierte una fecha YYYY-MM-DD en límites UTC para la zona horaria America/Mexico_City (UTC-6)
 */
function getMexicoDateBoundsUTC(dateStr: string): { startUTC: string; endUTC: string } {
  const [year, month, day] = dateStr.split("-").map(Number);
  const startUtcMs = Date.UTC(year, month - 1, day, 6, 0, 0, 0);
  const endUtcMs = Date.UTC(year, month - 1, day + 1, 5, 59, 59, 999);
  return {
    startUTC: new Date(startUtcMs).toISOString(),
    endUTC: new Date(endUtcMs).toISOString(),
  };
}

function getTodayMexicoDateStr(): string {
  const now = new Date();
  const mexicoMs = now.getTime() - 6 * 3600 * 1000;
  return new Date(mexicoMs).toISOString().split("T")[0];
}

function formatMexicoDateTime(isoString: string | null | undefined): { date: string; time: string } {
  if (!isoString) return { date: "", time: "" };
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return { date: "", time: "" };
  const mexicoMs = d.getTime() - 6 * 3600 * 1000;
  const mex = new Date(mexicoMs);
  const iso = mex.toISOString();
  return {
    date: iso.slice(0, 10),
    time: iso.slice(11, 16),
  };
}

function timingSafeCompare(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

async function verifyAuthorization(
  req: Request,
  bodyApiKey?: string
): Promise<{ authorized: boolean; authMethod?: string; reason?: string }> {
  const configuredSyncKey =
    Deno.env.get("CONTROL_CDV_API_KEY") || Deno.env.get("WEBHOOK_API_KEY");
  const headerApiKey =
    req.headers.get("x-api-key") || req.headers.get("x-control-cdv-key") || "";
  const authHeader = req.headers.get("authorization") || "";
  const bearerToken = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";

  // 1. Autenticación Server-to-Server estricta por API Key privada (CONTROL_CDV_API_KEY)
  // NUNCA se acepta SUPABASE_ANON_KEY como llave de sincronización
  if (configuredSyncKey) {
    if (
      timingSafeCompare(headerApiKey, configuredSyncKey) ||
      (bodyApiKey && timingSafeCompare(bodyApiKey, configuredSyncKey)) ||
      timingSafeCompare(bearerToken, configuredSyncKey)
    ) {
      return { authorized: true, authMethod: "api_key" };
    }
  }

  // 2. Autenticación por JWT de sesión de usuario con rol operativo (admin, supervisor, operador)
  if (bearerToken) {
    const { data: userData, error: userError } = await supabase.auth.getUser(
      bearerToken
    );
    if (!userError && userData?.user) {
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .in("role", ["admin", "supervisor", "operador"])
        .maybeSingle();

      if (roleRow) {
        return { authorized: true, authMethod: `jwt_${roleRow.role}` };
      }
      return {
        authorized: false,
        reason:
          "El usuario autenticado no tiene rol de operador, supervisor o administrador",
      };
    }
  }

  if (!configuredSyncKey) {
    return {
      authorized: false,
      reason:
        "CONTROL_CDV_API_KEY no está configurada en los secrets del servidor o no se envió un JWT válido de operador/admin",
    };
  }

  return {
    authorized: false,
    reason:
      "Credenciales de API inválidas o ausentes. Se requiere x-api-key privada (CONTROL_CDV_API_KEY) o sesión JWT autorizada",
  };
}

async function buildSyncPayload(params: {
  date?: string;
  startDate?: string;
  endDate?: string;
  operatorId?: string | null;
  onlyCash?: boolean;
}) {
  const targetDate = params.date || getTodayMexicoDateStr();
  const bounds = getMexicoDateBoundsUTC(targetDate);
  const startUTC = params.startDate
    ? params.startDate.includes("T")
      ? params.startDate
      : getMexicoDateBoundsUTC(params.startDate).startUTC
    : bounds.startUTC;
  const endUTC = params.endDate
    ? params.endDate.includes("T")
      ? params.endDate
      : getMexicoDateBoundsUTC(params.endDate).endUTC
    : bounds.endUTC;

  // Consultar reservas regulares en el rango de cobro
  let bookingsQuery = supabase
    .from("bookings")
    .select(`
      id,
      court_id,
      user_id,
      start_time,
      end_time,
      status,
      amount,
      actual_amount_charged,
      currency,
      payment_method,
      payment_gateway,
      payment_id,
      booking_made_at,
      payment_completed_at,
      created_at,
      processed_by,
      user:profiles!bookings_user_id_fkey_profiles(full_name, member_id, phone),
      court:courts!bookings_court_id_fkey(name, court_type),
      operator:profiles!bookings_processed_by_fkey(full_name)
    `)
    .in("status", ["paid", "cancelled"])
    .or(
      `and(payment_completed_at.gte.${startUTC},payment_completed_at.lte.${endUTC}),and(payment_completed_at.is.null,booking_made_at.gte.${startUTC},booking_made_at.lte.${endUTC})`
    );

  if (params.operatorId) {
    bookingsQuery = bookingsQuery.eq("processed_by", params.operatorId);
  }
  if (params.onlyCash) {
    bookingsQuery = bookingsQuery.in("payment_method", ["cash", "efectivo"]);
  }

  const { data: regularBookings, error: bookingsError } = await bookingsQuery;
  if (bookingsError) {
    throw new Error(`Error consultando reservas: ${bookingsError.message}`);
  }

  // Obtener folios de recibos para las reservas encontradas
  const bookingIds = (regularBookings || []).map((b: any) => b.id);
  const receiptMap = new Map<string, string>();
  if (bookingIds.length > 0) {
    const { data: receipts } = await supabase
      .from("receipt_numbers")
      .select("booking_id, receipt_number")
      .in("booking_id", bookingIds);
    for (const r of receipts || []) {
      if (r.booking_id && r.receipt_number) {
        receiptMap.set(r.booking_id, r.receipt_number);
      }
    }
  }

  // Consultar reservas especiales con pago completado en el rango
  let specialQuery = supabase
    .from("special_bookings")
    .select(`
      id,
      court_id,
      reference_user_id,
      start_time,
      end_time,
      status,
      price_type,
      custom_price,
      payment_method,
      payment_completed_at,
      created_at,
      processed_by,
      created_by,
      title,
      event_type,
      user:profiles!special_bookings_reference_user_id_fkey(full_name, member_id, phone),
      court:courts!special_bookings_court_id_fkey(name, court_type),
      operator:profiles!special_bookings_processed_by_fkey(full_name)
    `)
    .in("status", ["paid", "cancelled"])
    .not("payment_completed_at", "is", null)
    .gte("payment_completed_at", startUTC)
    .lte("payment_completed_at", endUTC);

  if (params.operatorId) {
    specialQuery = specialQuery.eq("processed_by", params.operatorId);
  }
  if (params.onlyCash) {
    specialQuery = specialQuery.in("payment_method", ["cash", "efectivo"]);
  }

  const { data: specialBookings } = await specialQuery;

  const transactions: any[] = [];

  for (const b of regularBookings || []) {
    const userObj = Array.isArray(b.user) ? b.user[0] : b.user;
    const courtObj = Array.isArray(b.court) ? b.court[0] : b.court;
    const operatorObj = Array.isArray(b.operator) ? b.operator[0] : b.operator;
    const paymentTimestamp = b.payment_completed_at || b.booking_made_at || b.created_at;
    const paymentMex = formatMexicoDateTime(paymentTimestamp);
    const startMex = formatMexicoDateTime(b.start_time);
    const endMex = formatMexicoDateTime(b.end_time);
    const isCash = b.payment_method === "cash" || b.payment_method === "efectivo";
    const amount = Number(b.actual_amount_charged ?? b.amount ?? 0);
    const receiptFolio = receiptMap.get(b.id) || `RES-${String(b.id).slice(0, 8).toUpperCase()}`;
    const startMs = Date.parse(b.start_time);
    const endMs = Date.parse(b.end_time);
    const durationHours = !isNaN(startMs) && !isNaN(endMs) ? Math.max(0.5, (endMs - startMs) / 3600000) : 1;
    const courtName = courtObj?.name || "Cancha";
    const courtType = courtObj?.court_type || "padel";

    transactions.push({
      external_transaction_id: b.id,
      booking_id: b.id,
      booking_type: "regular",
      folio: receiptFolio,
      receipt_number: receiptMap.get(b.id) || null,
      status: b.status,
      payment_timestamp: paymentTimestamp,
      payment_date_cdmx: paymentMex.date,
      payment_time_cdmx: paymentMex.time,
      payment_method: b.payment_method || "online",
      payment_channel: isCash ? "VENTANILLA" : "EN_LINEA",
      control_cdv_payment_method: isCash ? "CASH" : "CARD",
      payment_gateway: b.payment_gateway || (isCash ? "efectivo" : "online"),
      payment_reference: b.payment_id || receiptFolio,
      amount,
      currency: "MXN",
      include_in_cash_drawer: isCash,
      member: {
        user_id: b.user_id,
        action_number: userObj?.member_id || null,
        member_id: userObj?.member_id || null,
        full_name: userObj?.full_name || "Socio CDV",
        phone: userObj?.phone || null,
      },
      court: {
        court_id: b.court_id,
        name: courtName,
        court_type: courtType,
      },
      reservation: {
        start_time: b.start_time,
        end_time: b.end_time,
        date_cdmx: startMex.date,
        start_time_cdmx: startMex.time,
        end_time_cdmx: endMex.time,
        duration_hours: durationHours,
        concept_description: `Reserva Cancha ${courtName} (${startMex.date} ${startMex.time}-${endMex.time})`,
      },
      operator: {
        operator_id: b.processed_by || null,
        operator_name: operatorObj?.full_name || (isCash ? "Recepción" : "Sistema En Línea"),
      },
    });
  }

  for (const sb of specialBookings || []) {
    const userObj = Array.isArray(sb.user) ? sb.user[0] : sb.user;
    const courtObj = Array.isArray(sb.court) ? sb.court[0] : sb.court;
    const operatorObj = Array.isArray(sb.operator) ? sb.operator[0] : sb.operator;
    const paymentTimestamp = sb.payment_completed_at || sb.created_at;
    const paymentMex = formatMexicoDateTime(paymentTimestamp);
    const startMex = formatMexicoDateTime(sb.start_time);
    const endMex = formatMexicoDateTime(sb.end_time);
    const isCash = !sb.payment_method || sb.payment_method === "cash" || sb.payment_method === "efectivo";
    const amount = sb.price_type === "free" ? 0 : Number(sb.custom_price ?? 0);
    const folio = `ESP-${String(sb.id).slice(0, 8).toUpperCase()}`;
    const startMs = Date.parse(sb.start_time);
    const endMs = Date.parse(sb.end_time);
    const durationHours = !isNaN(startMs) && !isNaN(endMs) ? Math.max(0.5, (endMs - startMs) / 3600000) : 1;
    const courtName = courtObj?.name || "Cancha";
    const courtType = courtObj?.court_type || "padel";

    transactions.push({
      external_transaction_id: `special-${sb.id}`,
      booking_id: sb.id,
      booking_type: "special",
      folio,
      receipt_number: null,
      status: sb.status || "paid",
      payment_timestamp: paymentTimestamp,
      payment_date_cdmx: paymentMex.date,
      payment_time_cdmx: paymentMex.time,
      payment_method: sb.payment_method || "efectivo",
      payment_channel: isCash ? "VENTANILLA" : "EN_LINEA",
      control_cdv_payment_method: isCash ? "CASH" : "CARD",
      payment_gateway: "admin",
      payment_reference: folio,
      amount,
      currency: "MXN",
      include_in_cash_drawer: isCash && amount > 0,
      member: {
        user_id: sb.reference_user_id || null,
        action_number: userObj?.member_id || null,
        member_id: userObj?.member_id || null,
        full_name: userObj?.full_name || sb.title || "Evento Especial",
        phone: userObj?.phone || null,
      },
      court: {
        court_id: sb.court_id,
        name: courtName,
        court_type: courtType,
      },
      reservation: {
        start_time: sb.start_time,
        end_time: sb.end_time,
        date_cdmx: startMex.date,
        start_time_cdmx: startMex.time,
        end_time_cdmx: endMex.time,
        duration_hours: durationHours,
        concept_description: `Evento Especial: ${sb.title || sb.event_type} - ${courtName} (${startMex.date} ${startMex.time}-${endMex.time})`,
      },
      operator: {
        operator_id: sb.processed_by || sb.created_by || null,
        operator_name: operatorObj?.full_name || "Recepción / Administración",
      },
    });
  }

  transactions.sort(
    (a, b) => new Date(a.payment_timestamp).getTime() - new Date(b.payment_timestamp).getTime()
  );

  // Calcular resumen para Corte de Caja de Control CDV
  let cashVentanillaTotal = 0;
  let cashVentanillaCount = 0;
  let onlineTotal = 0;
  let onlineCount = 0;
  let specialEventsTotal = 0;
  let specialEventsCount = 0;
  let activeCount = 0;
  let cancelledCount = 0;

  const operatorMap = new Map<
    string,
    {
      operator_id: string | null;
      operator_name: string;
      cash_total: number;
      online_total: number;
      total_amount: number;
      transactions_count: number;
      active_count: number;
      cancelled_count: number;
    }
  >();

  for (const tx of transactions) {
    if (tx.status === "paid") activeCount++;
    else if (tx.status === "cancelled") cancelledCount++;

    if (tx.payment_channel === "VENTANILLA") {
      cashVentanillaTotal += tx.amount;
      cashVentanillaCount++;
    } else {
      onlineTotal += tx.amount;
      onlineCount++;
    }

    if (tx.booking_type === "special") {
      specialEventsTotal += tx.amount;
      specialEventsCount++;
    }

    const opKey = tx.operator.operator_id || "SISTEMA_ONLINE";
    const existingOp = operatorMap.get(opKey) || {
      operator_id: tx.operator.operator_id,
      operator_name: tx.operator.operator_name,
      cash_total: 0,
      online_total: 0,
      total_amount: 0,
      transactions_count: 0,
      active_count: 0,
      cancelled_count: 0,
    };

    if (tx.payment_channel === "VENTANILLA") {
      existingOp.cash_total += tx.amount;
    } else {
      existingOp.online_total += tx.amount;
    }
    existingOp.total_amount += tx.amount;
    existingOp.transactions_count++;
    if (tx.status === "paid") existingOp.active_count++;
    else if (tx.status === "cancelled") existingOp.cancelled_count++;

    operatorMap.set(opKey, existingOp);
  }

  return {
    success: true,
    source: "ace-booking-system",
    club: "Centro Deportivo Veracruzano",
    event: "cash_cut_sync",
    sync_timestamp: new Date().toISOString(),
    timezone: "America/Mexico_City",
    period: {
      date: targetDate,
      start_utc: startUTC,
      end_utc: endUTC,
    },
    filters: {
      operator_id: params.operatorId || null,
      only_cash: Boolean(params.onlyCash),
    },
    summary: {
      total_transactions: transactions.length,
      active_transactions: activeCount,
      cancelled_transactions: cancelledCount,
      cash_ventanilla_total: cashVentanillaTotal,
      cash_ventanilla_count: cashVentanillaCount,
      online_total: onlineTotal,
      online_count: onlineCount,
      special_events_total: specialEventsTotal,
      special_events_count: specialEventsCount,
      grand_total: cashVentanillaTotal + onlineTotal,
      by_operator: Array.from(operatorMap.values()),
    },
    transactions,
  };
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let body: any = {};

    if (req.method === "POST") {
      const rawText = await req.text();
      if (rawText) {
        try {
          body = JSON.parse(rawText);
        } catch {
          return new Response(
            JSON.stringify({ success: false, error: "Cuerpo JSON inválido" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    const authCheck = await verifyAuthorization(req, body?.apiKey);
    if (!authCheck.authorized) {
      return new Response(
        JSON.stringify({ success: false, error: authCheck.reason || "No autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const date = body.date || url.searchParams.get("date") || undefined;
    const startDate = body.start_date || url.searchParams.get("start_date") || undefined;
    const endDate = body.end_date || url.searchParams.get("end_date") || undefined;
    const operatorId = body.operator_id || url.searchParams.get("operator_id") || null;
    const onlyCash =
      body.only_cash === true ||
      url.searchParams.get("only_cash") === "true" ||
      url.searchParams.get("payment_method") === "cash";
    const action = body.action || url.searchParams.get("action") || "pull";

    const payload = await buildSyncPayload({
      date,
      startDate,
      endDate,
      operatorId,
      onlyCash,
    });

    // Si la acción es "push", enviamos el payload hacia Control CDV o webhooks activos de tipo cash_cut_sync
    if (action === "push") {
      const targetUrl = body.target_url;
      const customHeaders = body.target_headers || {};
      const deliveryResults: Array<{ name: string; url: string; status: number; ok: boolean; response?: string }> = [];

      if (targetUrl) {
        const res = await fetch(targetUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...customHeaders,
          },
          body: JSON.stringify(payload),
        });
        const respText = await res.text().catch(() => "");
        deliveryResults.push({
          name: "Control CDV Direct Endpoint",
          url: targetUrl,
          status: res.status,
          ok: res.ok,
          response: respText.slice(0, 500),
        });
      }

      const { data: webhooks } = await supabase
        .from("webhooks")
        .select("*")
        .eq("event_type", "cash_cut_sync")
        .eq("is_active", true);

      for (const wh of webhooks || []) {
        if (targetUrl && wh.url === targetUrl) continue;
        try {
          const whHeaders = (wh.headers as Record<string, string>) || {};
          const res = await fetch(wh.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...whHeaders,
            },
            body: JSON.stringify({
              ...payload,
              webhook_name: wh.name,
            }),
          });
          const respText = await res.text().catch(() => "");
          deliveryResults.push({
            name: wh.name,
            url: wh.url,
            status: res.status,
            ok: res.ok,
            response: respText.slice(0, 500),
          });
        } catch (err: any) {
          deliveryResults.push({
            name: wh.name,
            url: wh.url,
            status: 0,
            ok: false,
            response: err?.message || "Error de conexión",
          });
        }
      }

      return new Response(
        JSON.stringify({
          ...payload,
          push_deliveries: deliveryResults,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in control-cdv-sync function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || "Error interno al sincronizar transacciones",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
