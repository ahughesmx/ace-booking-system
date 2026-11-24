import { supabase } from "@/lib/supabase-client";
import {
  getStartOfDateMexicoCityISO,
  getEndOfDateMexicoCityISO,
  formatInMexicoCityTime,
} from "@/utils/timezone";

export interface ControlCdvTransaction {
  external_transaction_id: string;
  booking_id: string;
  booking_type: "regular" | "special";
  folio: string;
  receipt_number: string | null;
  status: string;
  payment_timestamp: string;
  payment_date_cdmx: string;
  payment_time_cdmx: string;
  payment_method: string;
  payment_channel: "VENTANILLA" | "EN_LINEA";
  control_cdv_payment_method: "CASH" | "CARD";
  payment_gateway: string;
  payment_reference: string;
  amount: number;
  currency: string;
  include_in_cash_drawer: boolean;
  member: {
    user_id: string | null;
    action_number: string | null;
    member_id: string | null;
    full_name: string;
    phone: string | null;
  };
  court: {
    court_id: string | null;
    name: string;
    court_type: string;
  };
  reservation: {
    start_time: string;
    end_time: string;
    date_cdmx: string;
    start_time_cdmx: string;
    end_time_cdmx: string;
    duration_hours: number;
    concept_description: string;
  };
  operator: {
    operator_id: string | null;
    operator_name: string;
  };
}

export interface ControlCdvOperatorBreakdown {
  operator_id: string | null;
  operator_name: string;
  cash_total: number;
  online_total: number;
  total_amount: number;
  transactions_count: number;
  active_count: number;
  cancelled_count: number;
}

export interface ControlCdvSyncPayload {
  success: boolean;
  source: "ace-booking-system";
  club: "Centro Deportivo Veracruzano";
  event: "cash_cut_sync";
  sync_timestamp: string;
  timezone: "America/Mexico_City";
  period: {
    date: string;
    start_utc: string;
    end_utc: string;
  };
  filters: {
    operator_id: string | null;
    only_cash: boolean;
  };
  summary: {
    total_transactions: number;
    active_transactions: number;
    cancelled_transactions: number;
    cash_ventanilla_total: number;
    cash_ventanilla_count: number;
    online_total: number;
    online_count: number;
    special_events_total: number;
    special_events_count: number;
    grand_total: number;
    by_operator: ControlCdvOperatorBreakdown[];
  };
  transactions: ControlCdvTransaction[];
}

export interface ControlCdvConnectionConfig {
  pushUrl: string;
  apiKey: string;
  onlyCashDefault: boolean;
}

const CONTROL_CDV_CONFIG_KEY = "cdv_control_sync_config_v1";
const CONTROL_CDV_LAST_SYNC_KEY = "cdv_control_last_sync_v1";

export const SUPABASE_PROJECT_URL = "https://bpjinatcgdmxqetfxjji.supabase.co";
export const CONTROL_CDV_PULL_ENDPOINT = `${SUPABASE_PROJECT_URL}/functions/v1/control-cdv-sync`;
export const CONTROL_CDV_REST_RPC_ENDPOINT = `${SUPABASE_PROJECT_URL}/rest/v1/rpc/get_daily_transactions_for_control_cdv`;

export function getControlCdvConfig(): ControlCdvConnectionConfig {
  try {
    const raw = localStorage.getItem(CONTROL_CDV_CONFIG_KEY);
    if (!raw) {
      return {
        pushUrl: "",
        apiKey: "",
        onlyCashDefault: false,
      };
    }
    const parsed = JSON.parse(raw);
    return {
      pushUrl: parsed.pushUrl || "",
      apiKey: parsed.apiKey || "",
      onlyCashDefault: Boolean(parsed.onlyCashDefault),
    };
  } catch {
    return {
      pushUrl: "",
      apiKey: "",
      onlyCashDefault: false,
    };
  }
}

export function saveControlCdvConfig(config: ControlCdvConnectionConfig) {
  try {
    localStorage.setItem(CONTROL_CDV_CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.error("Error guardando configuración de Control CDV:", e);
  }
}

export interface LastSyncRecord {
  timestamp: string;
  date: string;
  totalTransactions: number;
  cashTotal: number;
  grandTotal: number;
  target: string;
  status: "success" | "error";
  message: string;
}

export function getLastControlCdvSync(): LastSyncRecord | null {
  try {
    const raw = localStorage.getItem(CONTROL_CDV_LAST_SYNC_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveLastControlCdvSync(record: LastSyncRecord) {
  try {
    localStorage.setItem(CONTROL_CDV_LAST_SYNC_KEY, JSON.stringify(record));
  } catch (e) {
    console.error("Error guardando historial de sincronización:", e);
  }
}

function safeFormatMexico(isoString: string | null | undefined, fmt: string): string {
  if (!isoString) return "";
  try {
    return formatInMexicoCityTime(isoString, fmt);
  } catch {
    return "";
  }
}

export function mapRawRowToTransaction(row: any): ControlCdvTransaction {
  const paymentTimestamp =
    row.payment_timestamp ||
    row.payment_completed_at ||
    row.booking_made_at ||
    row.created_at ||
    new Date().toISOString();

  const paymentDateCdmx = safeFormatMexico(paymentTimestamp, "yyyy-MM-dd");
  const paymentTimeCdmx = safeFormatMexico(paymentTimestamp, "HH:mm");
  const startDateCdmx = safeFormatMexico(row.start_time, "yyyy-MM-dd");
  const startTimeCdmx = safeFormatMexico(row.start_time, "HH:mm");
  const endTimeCdmx = safeFormatMexico(row.end_time, "HH:mm");

  const method = String(row.payment_method || "online").toLowerCase();
  const isCash = method === "cash" || method === "efectivo";
  const amount = Number(row.amount ?? row.actual_amount_charged ?? 0);
  const bookingType: "regular" | "special" =
    row.booking_type === "special" ? "special" : "regular";

  const folio =
    row.folio ||
    row.receipt_number ||
    `${bookingType === "special" ? "ESP" : "RES"}-${String(row.id || "")
      .slice(0, 8)
      .toUpperCase()}`;

  const startMs = Date.parse(row.start_time);
  const endMs = Date.parse(row.end_time);
  const durationHours =
    !isNaN(startMs) && !isNaN(endMs)
      ? Math.max(0.5, Number(((endMs - startMs) / 3600000).toFixed(2)))
      : 1;

  const courtName = row.court_name || row.court?.name || "Cancha";
  const courtType = row.court_type || row.court?.court_type || "padel";
  const memberName =
    row.user_full_name || row.user?.full_name || row.title || "Socio CDV";
  const memberId = row.user_member_id || row.user?.member_id || null;
  const memberPhone = row.user_phone || row.user?.phone || null;
  const operatorName =
    row.processed_by_name ||
    row.operator?.full_name ||
    (isCash ? "Recepción" : "Sistema En Línea");

  const conceptDescription =
    bookingType === "special"
      ? `Evento Especial: ${row.title || row.event_type || "Reserva"} - ${courtName} (${startDateCdmx} ${startTimeCdmx}-${endTimeCdmx})`
      : `Reserva Cancha ${courtName} (${startDateCdmx} ${startTimeCdmx}-${endTimeCdmx})`;

  return {
    external_transaction_id:
      bookingType === "special" && !String(row.id).startsWith("special-")
        ? `special-${row.id}`
        : String(row.id),
    booking_id: String(row.id),
    booking_type: bookingType,
    folio,
    receipt_number: row.receipt_number || (folio.startsWith("COB-") ? folio : null),
    status: row.status || "paid",
    payment_timestamp: paymentTimestamp,
    payment_date_cdmx: paymentDateCdmx,
    payment_time_cdmx: paymentTimeCdmx,
    payment_method: method,
    payment_channel: isCash ? "VENTANILLA" : "EN_LINEA",
    control_cdv_payment_method: isCash ? "CASH" : "CARD",
    payment_gateway: row.payment_gateway || (isCash ? "efectivo" : "online"),
    payment_reference: row.payment_id || folio,
    amount,
    currency: row.currency || "MXN",
    include_in_cash_drawer: isCash && amount > 0,
    member: {
      user_id: row.user_id || null,
      action_number: memberId,
      member_id: memberId,
      full_name: memberName,
      phone: memberPhone,
    },
    court: {
      court_id: row.court_id || null,
      name: courtName,
      court_type: courtType,
    },
    reservation: {
      start_time: row.start_time,
      end_time: row.end_time,
      date_cdmx: startDateCdmx,
      start_time_cdmx: startTimeCdmx,
      end_time_cdmx: endTimeCdmx,
      duration_hours: durationHours,
      concept_description: conceptDescription,
    },
    operator: {
      operator_id: row.processed_by || null,
      operator_name: operatorName,
    },
  };
}

export function buildPayloadFromTransactions(
  transactions: ControlCdvTransaction[],
  params: {
    selectedDate: string;
    startUTC: string;
    endUTC: string;
    operatorId?: string | null;
    onlyCash?: boolean;
  }
): ControlCdvSyncPayload {
  const sorted = [...transactions].sort(
    (a, b) =>
      new Date(a.payment_timestamp).getTime() -
      new Date(b.payment_timestamp).getTime()
  );

  let cashVentanillaTotal = 0;
  let cashVentanillaCount = 0;
  let onlineTotal = 0;
  let onlineCount = 0;
  let specialEventsTotal = 0;
  let specialEventsCount = 0;
  let activeCount = 0;
  let cancelledCount = 0;

  const operatorMap = new Map<string, ControlCdvOperatorBreakdown>();

  for (const tx of sorted) {
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
    const existing = operatorMap.get(opKey) || {
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
      existing.cash_total += tx.amount;
    } else {
      existing.online_total += tx.amount;
    }
    existing.total_amount += tx.amount;
    existing.transactions_count++;
    if (tx.status === "paid") existing.active_count++;
    else if (tx.status === "cancelled") existing.cancelled_count++;

    operatorMap.set(opKey, existing);
  }

  return {
    success: true,
    source: "ace-booking-system",
    club: "Centro Deportivo Veracruzano",
    event: "cash_cut_sync",
    sync_timestamp: new Date().toISOString(),
    timezone: "America/Mexico_City",
    period: {
      date: params.selectedDate,
      start_utc: params.startUTC,
      end_utc: params.endUTC,
    },
    filters: {
      operator_id: params.operatorId || null,
      only_cash: Boolean(params.onlyCash),
    },
    summary: {
      total_transactions: sorted.length,
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
    transactions: sorted,
  };
}

/**
 * Obtiene todas las transacciones del día estructuradas bajo el contrato de sincronización Control CDV.
 * Intenta primero el RPC dedicado `get_daily_transactions_for_control_cdv`; si aún no se ha corrido la migración
 * en la BD remota, utiliza automáticamente el fallback con `get_combined_bookings_for_reports` y consultas directas.
 */
export async function fetchDailyTransactionsForControlCdv(params: {
  selectedDate: string;
  operatorId?: string | null;
  onlyCash?: boolean;
}): Promise<ControlCdvSyncPayload> {
  const startUTC = getStartOfDateMexicoCityISO(params.selectedDate);
  const endUTC = getEndOfDateMexicoCityISO(params.selectedDate);

  // 1. Intentar nuevo RPC get_daily_transactions_for_control_cdv
  try {
    const { data: rpcData, error: rpcError } = await (supabase.rpc as any)(
      "get_daily_transactions_for_control_cdv",
      {
        p_start_date: startUTC,
        p_end_date: endUTC,
        p_operator_id: params.operatorId || null,
        p_only_cash: Boolean(params.onlyCash),
      }
    );

    if (!rpcError && Array.isArray(rpcData)) {
      const transactions = rpcData.map(mapRawRowToTransaction);
      return buildPayloadFromTransactions(transactions, {
        selectedDate: params.selectedDate,
        startUTC,
        endUTC,
        operatorId: params.operatorId,
        onlyCash: params.onlyCash,
      });
    }
  } catch {
    // Continuar con fallback si el RPC aún no está desplegado
  }

  // 2. Fallback A: RPC existente get_combined_bookings_for_reports (para admin / supervisor)
  try {
    const { data: reportsData, error: reportsError } = await supabase.rpc(
      "get_combined_bookings_for_reports",
      {
        p_start_date: startUTC,
        p_end_date: endUTC,
        p_operator_id: params.operatorId || undefined,
      }
    );

    if (!reportsError && Array.isArray(reportsData)) {
      const bookingIds = reportsData
        .filter((r: any) => r.booking_type === "regular" && r.id)
        .map((r: any) => r.id as string);

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

      const filteredRows = params.onlyCash
        ? reportsData.filter(
            (r: any) => r.payment_method === "cash" || r.payment_method === "efectivo"
          )
        : reportsData;

      const transactions = filteredRows.map((r: any) =>
        mapRawRowToTransaction({
          ...r,
          receipt_number: r.id ? receiptMap.get(r.id) || null : null,
        })
      );

      return buildPayloadFromTransactions(transactions, {
        selectedDate: params.selectedDate,
        startUTC,
        endUTC,
        operatorId: params.operatorId,
        onlyCash: params.onlyCash,
      });
    }
  } catch {
    // Continuar con consulta directa para operadores
  }

  // 3. Fallback B: Consulta directa a la tabla bookings (accesible para rol operador)
  let query = supabase
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
      profiles:user_id (
        full_name,
        member_id,
        phone
      ),
      courts (
        name,
        court_type
      )
    `)
    .in("status", ["paid", "cancelled"])
    .or(
      `and(payment_completed_at.gte.${startUTC},payment_completed_at.lte.${endUTC}),and(payment_completed_at.is.null,booking_made_at.gte.${startUTC},booking_made_at.lte.${endUTC})`
    );

  if (params.operatorId) {
    query = query.eq("processed_by", params.operatorId);
  }
  if (params.onlyCash) {
    query = query.in("payment_method", ["cash", "efectivo"]);
  }

  const { data: directBookings, error: directError } = await query;
  if (directError) {
    throw directError;
  }

  const bookingIds = (directBookings || []).map((b: any) => b.id);
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

  const operatorIds = Array.from(
    new Set((directBookings || []).map((b: any) => b.processed_by).filter(Boolean))
  ) as string[];
  const operatorNameMap = new Map<string, string>();
  if (operatorIds.length > 0) {
    const { data: opProfiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", operatorIds);
    for (const op of opProfiles || []) {
      if (op.id && op.full_name) {
        operatorNameMap.set(op.id, op.full_name);
      }
    }
  }

  const transactions = (directBookings || []).map((b: any) => {
    const userObj = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles;
    const courtObj = Array.isArray(b.courts) ? b.courts[0] : b.courts;
    return mapRawRowToTransaction({
      ...b,
      booking_type: "regular",
      receipt_number: receiptMap.get(b.id) || null,
      user_full_name: userObj?.full_name,
      user_member_id: userObj?.member_id,
      user_phone: userObj?.phone,
      court_name: courtObj?.name,
      court_type: courtObj?.court_type,
      processed_by_name: b.processed_by ? operatorNameMap.get(b.processed_by) : null,
    });
  });

  return buildPayloadFromTransactions(transactions, {
    selectedDate: params.selectedDate,
    startUTC,
    endUTC,
    operatorId: params.operatorId,
    onlyCash: params.onlyCash,
  });
}

/**
 * Envía (Push) el lote de transacciones del día hacia Control CDV.
 * Soporta tanto webhooks activos configurados con event_type = 'cash_cut_sync'
 * como una URL directa configurada para Control CDV (local o remota).
 */
export async function pushTransactionsToControlCdv(params: {
  payload: ControlCdvSyncPayload;
  overrideUrl?: string;
  overrideApiKey?: string;
}): Promise<{
  deliveredCount: number;
  targets: Array<{ name: string; url: string; ok: boolean; status: number; message?: string }>;
}> {
  const { payload, overrideUrl, overrideApiKey } = params;
  const savedConfig = getControlCdvConfig();
  const targetUrl = (overrideUrl ?? savedConfig.pushUrl).trim();
  const apiKey = (overrideApiKey ?? savedConfig.apiKey).trim();

  const targetsToCall: Array<{
    name: string;
    url: string;
    headers: Record<string, string>;
  }> = [];

  if (targetUrl) {
    targetsToCall.push({
      name: "Control CDV (Endpoint Directo)",
      url: targetUrl,
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { "x-api-key": apiKey, Authorization: `Bearer ${apiKey}` } : {}),
      },
    });
  }

  // Consultar también webhooks activos de tipo 'cash_cut_sync'
  try {
    const { data: webhooks } = await supabase
      .from("webhooks")
      .select("*")
      .eq("event_type", "cash_cut_sync")
      .eq("is_active", true);

    for (const wh of webhooks || []) {
      if (wh.url && wh.url !== targetUrl) {
        const customHeaders = (wh.headers as Record<string, string>) || {};
        targetsToCall.push({
          name: wh.name || "Webhook Control CDV",
          url: wh.url,
          headers: {
            "Content-Type": "application/json",
            ...customHeaders,
          },
        });
      }
    }
  } catch {
    // Si el usuario es operador y RLS restringe lectura de webhooks, usar configuración local o Edge Function
  }

  if (targetsToCall.length === 0) {
    throw new Error(
      "No hay una URL destino de Control CDV configurada. Configura la URL del receptor de Control CDV o un webhook con el evento 'Sincronización de Corte de Caja'."
    );
  }

  const results: Array<{ name: string; url: string; ok: boolean; status: number; message?: string }> = [];

  for (const target of targetsToCall) {
    try {
      const response = await fetch(target.url, {
        method: "POST",
        headers: target.headers,
        body: JSON.stringify({
          ...payload,
          webhook_name: target.name,
        }),
      });
      const respText = await response.text().catch(() => "");
      results.push({
        name: target.name,
        url: target.url,
        ok: response.ok,
        status: response.status,
        message: respText ? respText.slice(0, 300) : `HTTP ${response.status}`,
      });
    } catch (err: any) {
      results.push({
        name: target.name,
        url: target.url,
        ok: false,
        status: 0,
        message: err?.message || "No se pudo conectar con el servidor de Control CDV",
      });
    }
  }

  const deliveredCount = results.filter((r) => r.ok).length;
  const firstTarget = results[0];

  saveLastControlCdvSync({
    timestamp: new Date().toISOString(),
    date: payload.period.date,
    totalTransactions: payload.summary.total_transactions,
    cashTotal: payload.summary.cash_ventanilla_total,
    grandTotal: payload.summary.grand_total,
    target: firstTarget?.url || "Control CDV",
    status: deliveredCount > 0 ? "success" : "error",
    message:
      deliveredCount > 0
        ? `Sincronizado correctamente (${payload.summary.total_transactions} movimientos)`
        : firstTarget?.message || "Error al sincronizar",
  });

  return {
    deliveredCount,
    targets: results,
  };
}

export function downloadControlCdvSyncJson(payload: ControlCdvSyncPayload) {
  const jsonContent = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `control_cdv_corte_caja_${payload.period.date}.json`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
