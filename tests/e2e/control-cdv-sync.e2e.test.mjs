import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");

const SUPABASE_URL = "https://bpjinatcgdmxqetfxjji.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwamluYXRjZ2RteHFldGZ4amppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU5NDU1NTgsImV4cCI6MjA1MTUyMTU1OH0.79yLPqxNagQqouMrbfCyfLeaEeg3TesEqQsrR9H_ZvQ";

/**
 * Replica exacta del motor de transformación y agregación de Control CDV
 * para validar extremo a extremo (Pull, Push, Idempotencia en Corte de Caja, Filtros y Esquema).
 */
function formatMexicoDateTime(isoString) {
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

function mapRawRowToTransaction(row) {
  const paymentTimestamp =
    row.payment_timestamp ||
    row.payment_completed_at ||
    row.booking_made_at ||
    row.created_at;

  const paymentMex = formatMexicoDateTime(paymentTimestamp);
  const startMex = formatMexicoDateTime(row.start_time);
  const endMex = formatMexicoDateTime(row.end_time);

  const method = String(row.payment_method || "online").toLowerCase();
  const isCash = method === "cash" || method === "efectivo";
  const amount = Number(row.amount ?? row.actual_amount_charged ?? 0);
  const bookingType = row.booking_type === "special" ? "special" : "regular";

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

  const courtName = row.court_name || "Cancha";
  const courtType = row.court_type || "padel";
  const memberName = row.user_full_name || row.title || "Socio CDV";
  const memberId = row.user_member_id || null;
  const operatorName =
    row.processed_by_name || (isCash ? "Recepción" : "Sistema En Línea");

  const conceptDescription =
    bookingType === "special"
      ? `Evento Especial: ${row.title || row.event_type || "Reserva"} - ${courtName} (${startMex.date} ${startMex.time}-${endMex.time})`
      : `Reserva Cancha ${courtName} (${startMex.date} ${startMex.time}-${endMex.time})`;

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
    payment_date_cdmx: paymentMex.date,
    payment_time_cdmx: paymentMex.time,
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
      phone: row.user_phone || null,
    },
    court: {
      court_id: row.court_id || null,
      name: courtName,
      court_type: courtType,
    },
    reservation: {
      start_time: row.start_time,
      end_time: row.end_time,
      date_cdmx: startMex.date,
      start_time_cdmx: startMex.time,
      end_time_cdmx: endMex.time,
      duration_hours: durationHours,
      concept_description: conceptDescription,
    },
    operator: {
      operator_id: row.processed_by || null,
      operator_name: operatorName,
    },
  };
}

function buildPayloadFromTransactions(transactions, params) {
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

  const operatorMap = new Map();

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

// Datos de prueba realistas del día (Ventanilla, En línea, Cancelada sin devolución, y Evento Especial)
const SAMPLE_RAW_BOOKINGS = [
  {
    id: "11111111-1111-4111-a111-111111111111",
    booking_type: "regular",
    receipt_number: "COB-2026-00101",
    status: "paid",
    payment_completed_at: "2026-11-24T15:30:00.000Z", // 09:30 CDMX
    start_time: "2026-11-24T16:00:00.000Z",           // 10:00 CDMX
    end_time: "2026-11-24T17:00:00.000Z",             // 11:00 CDMX
    amount: 250,
    actual_amount_charged: 250,
    currency: "MXN",
    payment_method: "efectivo",
    payment_gateway: "efectivo",
    payment_id: "efectivo_1732462200000",
    user_id: "u1111111-1111-4111-a111-111111111111",
    user_full_name: "Roberto Sánchez",
    user_member_id: "1001",
    user_phone: "2291112233",
    court_id: "3ba016c5-f936-4e1d-ac93-814597bd8aa5",
    court_name: "Pádel",
    court_type: "padel",
    processed_by: "op111111-1111-4111-a111-111111111111",
    processed_by_name: "Recepción Turno Matutino",
  },
  {
    id: "22222222-2222-4222-a222-222222222222",
    booking_type: "regular",
    receipt_number: "COB-2026-00102",
    status: "cancelled", // Cancelada sin devolución (debe seguir sumando en el corte de caja)
    payment_completed_at: "2026-11-24T17:15:00.000Z", // 11:15 CDMX
    start_time: "2026-11-24T20:00:00.000Z",           // 14:00 CDMX
    end_time: "2026-11-24T21:00:00.000Z",             // 15:00 CDMX
    amount: 250,
    actual_amount_charged: 250,
    currency: "MXN",
    payment_method: "cash",
    payment_gateway: "efectivo",
    payment_id: "efectivo_1732468500000",
    user_id: "u2222222-2222-4222-a222-222222222222",
    user_full_name: "Laura Gómez",
    user_member_id: "10202",
    user_phone: "2292223344",
    court_id: "3ba016c5-f936-4e1d-ac93-814597bd8aa5",
    court_name: "Pádel",
    court_type: "padel",
    processed_by: "op111111-1111-4111-a111-111111111111",
    processed_by_name: "Recepción Turno Matutino",
  },
  {
    id: "33333333-3333-4333-a333-333333333333",
    booking_type: "regular",
    receipt_number: null,
    status: "paid",
    payment_completed_at: "2026-11-24T19:00:00.000Z", // 13:00 CDMX
    start_time: "2026-11-24T23:00:00.000Z",           // 17:00 CDMX
    end_time: "2026-11-25T00:00:00.000Z",             // 18:00 CDMX
    amount: 250,
    actual_amount_charged: 250,
    currency: "MXN",
    payment_method: "online",
    payment_gateway: "stripe",
    payment_id: "cs_live_a1b2c3d4",
    user_id: "u3333333-3333-4333-a333-333333333333",
    user_full_name: "Carlos Mendoza",
    user_member_id: "405",
    user_phone: "2293334455",
    court_id: "3ba016c5-f936-4e1d-ac93-814597bd8aa5",
    court_name: "Pádel",
    court_type: "padel",
    processed_by: null,
    processed_by_name: null,
  },
  {
    id: "44444444-4444-4444-a444-444444444444",
    booking_type: "special",
    receipt_number: null,
    status: "paid",
    payment_completed_at: "2026-11-24T22:00:00.000Z", // 16:00 CDMX
    start_time: "2026-11-25T01:00:00.000Z",           // 19:00 CDMX
    end_time: "2026-11-25T03:00:00.000Z",             // 21:00 CDMX (2 horas)
    amount: 500,
    actual_amount_charged: 500,
    currency: "MXN",
    payment_method: "efectivo",
    payment_gateway: "admin",
    payment_id: null,
    user_id: "u4444444-4444-4444-a444-444444444444",
    user_full_name: "Fernando Torres",
    user_member_id: "88",
    user_phone: "2294445566",
    court_id: "3ba016c5-f936-4e1d-ac93-814597bd8aa5",
    court_name: "Pádel",
    court_type: "padel",
    processed_by: "op222222-2222-4222-a222-222222222222",
    processed_by_name: "Recepción Turno Vespertino",
    title: "Torneo Relámpago Nocturno",
    event_type: "torneo",
  },
];

describe("E2E Suite: Sincronización de Transacciones del Día con Control CDV (Corte de Caja)", () => {
  let mockServer;
  let baseUrl = "";
  const VALID_API_KEY = "cdv-secret-sync-key-2026";

  // Estado interno del servidor simulado de Control CDV (CashSession + Tickets sincronizados)
  const controlCdvCashDrawerState = {
    syncedTransactionsMap: new Map(), // external_transaction_id -> tx
    pushRequestsReceived: 0,
    lastReceivedPayload: null,
  };

  before(async () => {
    mockServer = http.createServer(async (req, res) => {
      const url = new URL(req.url, "http://127.0.0.1");

      // 1. Simulación del Endpoint Pull de Reservas CDV (/functions/v1/control-cdv-sync)
      if (url.pathname === "/functions/v1/control-cdv-sync" && req.method === "GET") {
        const apiKey = req.headers["x-api-key"];
        const authHeader = req.headers["authorization"] || "";
        if (apiKey !== VALID_API_KEY && authHeader !== `Bearer ${VALID_API_KEY}`) {
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: false, error: "Credenciales de sincronización inválidas" }));
          return;
        }

        const date = url.searchParams.get("date") || "2026-11-24";
        const operatorId = url.searchParams.get("operator_id") || null;
        const onlyCash = url.searchParams.get("only_cash") === "true";

        let rows = [...SAMPLE_RAW_BOOKINGS];
        if (operatorId) {
          rows = rows.filter((r) => r.processed_by === operatorId);
        }
        if (onlyCash) {
          rows = rows.filter((r) => r.payment_method === "cash" || r.payment_method === "efectivo");
        }

        const mapped = rows.map(mapRawRowToTransaction);
        const payload = buildPayloadFromTransactions(mapped, {
          selectedDate: date,
          startUTC: `${date}T06:00:00.000Z`,
          endUTC: "2026-11-25T05:59:59.999Z",
          operatorId,
          onlyCash,
        });

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(payload));
        return;
      }

      // 2. Simulación del Receptor en Control CDV (/api/cash-sessions/sync-reservas)
      if (url.pathname === "/api/cash-sessions/sync-reservas" && req.method === "POST") {
        const apiKey = req.headers["x-api-key"];
        if (apiKey !== VALID_API_KEY) {
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: false, message: "Invalid Control CDV API key" }));
          return;
        }

        let bodyText = "";
        for await (const chunk of req) {
          bodyText += chunk;
        }
        const payload = JSON.parse(bodyText);
        controlCdvCashDrawerState.pushRequestsReceived++;
        controlCdvCashDrawerState.lastReceivedPayload = payload;

        let newlyInserted = 0;
        let alreadyExisted = 0;

        for (const tx of payload.transactions || []) {
          if (controlCdvCashDrawerState.syncedTransactionsMap.has(tx.external_transaction_id)) {
            alreadyExisted++;
          } else {
            newlyInserted++;
          }
          controlCdvCashDrawerState.syncedTransactionsMap.set(tx.external_transaction_id, tx);
        }

        // Calcular total en efectivo en caja de recepción en Control CDV
        let cashDrawerTotal = 0;
        let cardOnlineTotal = 0;
        for (const tx of controlCdvCashDrawerState.syncedTransactionsMap.values()) {
          if (tx.include_in_cash_drawer && tx.control_cdv_payment_method === "CASH") {
            cashDrawerTotal += tx.amount;
          } else {
            cardOnlineTotal += tx.amount;
          }
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            success: true,
            newlyInserted,
            alreadyExisted,
            totalInSession: controlCdvCashDrawerState.syncedTransactionsMap.size,
            cashDrawerTotal,
            cardOnlineTotal,
          })
        );
        return;
      }

      res.writeHead(404);
      res.end();
    });

    await new Promise((resolve) => {
      mockServer.listen(0, "127.0.0.1", () => {
        const addr = mockServer.address();
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (mockServer) {
      await new Promise((resolve) => mockServer.close(resolve));
    }
  });

  it("1. Verifica artefactos de arquitectura: migración SQL, Edge Function, servicio y componentes UI", () => {
    const migrationPath = path.join(
      projectRoot,
      "supabase/migrations/20261124113000_add_control_cdv_cash_cut_sync.sql"
    );
    const edgeFnPath = path.join(
      projectRoot,
      "supabase/functions/control-cdv-sync/index.ts"
    );
    const servicePath = path.join(projectRoot, "src/services/control-cdv-sync.ts");
    const dialogPath = path.join(
      projectRoot,
      "src/components/operator/ControlCdvSyncDialog.tsx"
    );

    assert.equal(fs.existsSync(migrationPath), true, "Debe existir la migración SQL");
    assert.equal(fs.existsSync(edgeFnPath), true, "Debe existir la Edge Function control-cdv-sync");
    assert.equal(fs.existsSync(servicePath), true, "Debe existir el servicio control-cdv-sync.ts");
    assert.equal(fs.existsSync(dialogPath), true, "Debe existir el componente ControlCdvSyncDialog.tsx");

    const migrationSql = fs.readFileSync(migrationPath, "utf8");
    assert.match(migrationSql, /CREATE OR REPLACE FUNCTION public\.get_daily_transactions_for_control_cdv/);
    assert.match(migrationSql, /receipt_numbers/);
    assert.match(migrationSql, /special_bookings/);
  });

  it("2. Transforma y agrega correctamente todos los movimientos del día (Ventanilla, En Línea, Especiales y Canceladas sin devolución)", () => {
    const mapped = SAMPLE_RAW_BOOKINGS.map(mapRawRowToTransaction);
    const payload = buildPayloadFromTransactions(mapped, {
      selectedDate: "2026-11-24",
      startUTC: "2026-11-24T06:00:00.000Z",
      endUTC: "2026-11-25T05:59:59.999Z",
      operatorId: null,
      onlyCash: false,
    });

    // Validación de resumen financiero
    assert.equal(payload.summary.total_transactions, 4);
    assert.equal(payload.summary.active_transactions, 3);
    assert.equal(payload.summary.cancelled_transactions, 1);

    // Efectivo en ventanilla: $250 (vigente) + $250 (cancelada sin devolución) + $500 (torneo especial en efectivo) = $1,000
    assert.equal(payload.summary.cash_ventanilla_total, 1000);
    assert.equal(payload.summary.cash_ventanilla_count, 3);

    // En línea (Stripe): $250
    assert.equal(payload.summary.online_total, 250);
    assert.equal(payload.summary.online_count, 1);

    // Eventos especiales: $500
    assert.equal(payload.summary.special_events_total, 500);
    assert.equal(payload.summary.special_events_count, 1);

    // Total general del día: $1,250
    assert.equal(payload.summary.grand_total, 1250);

    // Desglose por operador (2 operadores de recepción + SISTEMA_ONLINE)
    assert.equal(payload.summary.by_operator.length, 3);
    const matutino = payload.summary.by_operator.find(
      (o) => o.operator_id === "op111111-1111-4111-a111-111111111111"
    );
    assert.ok(matutino);
    assert.equal(matutino.cash_total, 500);
    assert.equal(matutino.transactions_count, 2);
    assert.equal(matutino.active_count, 1);
    assert.equal(matutino.cancelled_count, 1);

    // Verificar mapeo de acción de socio y folio de recibo para Control CDV
    const firstTx = payload.transactions[0];
    assert.equal(firstTx.folio, "COB-2026-00101");
    assert.equal(firstTx.member.action_number, "1001");
    assert.equal(firstTx.payment_channel, "VENTANILLA");
    assert.equal(firstTx.control_cdv_payment_method, "CASH");
    assert.equal(firstTx.include_in_cash_drawer, true);
    assert.equal(firstTx.payment_date_cdmx, "2026-11-24");
    assert.equal(firstTx.payment_time_cdmx, "09:30");
  });

  it("3. Flujo E2E Pull: Control CDV se conecta al endpoint de Reservas CDV con autenticación y filtros", async () => {
    // 3.1 Intento sin API key debe ser rechazado con 401
    const unauthRes = await fetch(`${baseUrl}/functions/v1/control-cdv-sync?date=2026-11-24`);
    assert.equal(unauthRes.status, 401);

    // 3.2 Consulta Pull autenticada de todos los movimientos del día
    const pullAllRes = await fetch(
      `${baseUrl}/functions/v1/control-cdv-sync?date=2026-11-24`,
      {
        headers: { "x-api-key": VALID_API_KEY },
      }
    );
    assert.equal(pullAllRes.status, 200);
    const pullAllData = await pullAllRes.json();
    assert.equal(pullAllData.success, true);
    assert.equal(pullAllData.summary.total_transactions, 4);
    assert.equal(pullAllData.summary.cash_ventanilla_total, 1000);
    assert.equal(pullAllData.summary.grand_total, 1250);

    // 3.3 Consulta Pull filtrando únicamente efectivo en ventanilla (only_cash=true)
    const pullCashRes = await fetch(
      `${baseUrl}/functions/v1/control-cdv-sync?date=2026-11-24&only_cash=true`,
      {
        headers: { Authorization: `Bearer ${VALID_API_KEY}` },
      }
    );
    assert.equal(pullCashRes.status, 200);
    const pullCashData = await pullCashRes.json();
    assert.equal(pullCashData.summary.total_transactions, 3);
    assert.equal(pullCashData.summary.online_total, 0);
    assert.equal(pullCashData.summary.cash_ventanilla_total, 1000);

    // 3.4 Consulta Pull filtrando por operador específico (Turno Matutino)
    const pullOperatorRes = await fetch(
      `${baseUrl}/functions/v1/control-cdv-sync?date=2026-11-24&operator_id=op111111-1111-4111-a111-111111111111`,
      {
        headers: { "x-api-key": VALID_API_KEY },
      }
    );
    assert.equal(pullOperatorRes.status, 200);
    const pullOperatorData = await pullOperatorRes.json();
    assert.equal(pullOperatorData.summary.total_transactions, 2);
    assert.equal(pullOperatorData.summary.cash_ventanilla_total, 500);
  });

  it("4. Flujo E2E Push + Idempotencia: Reservas CDV envía el corte de caja a Control CDV sin duplicar cobros en reintentos", async () => {
    const mapped = SAMPLE_RAW_BOOKINGS.map(mapRawRowToTransaction);
    const payload = buildPayloadFromTransactions(mapped, {
      selectedDate: "2026-11-24",
      startUTC: "2026-11-24T06:00:00.000Z",
      endUTC: "2026-11-25T05:59:59.999Z",
      operatorId: null,
      onlyCash: false,
    });

    // Primer envío Push desde Corte de Caja hacia Control CDV
    const pushRes1 = await fetch(`${baseUrl}/api/cash-sessions/sync-reservas`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": VALID_API_KEY,
      },
      body: JSON.stringify(payload),
    });
    assert.equal(pushRes1.status, 200);
    const pushData1 = await pushRes1.json();
    assert.equal(pushData1.success, true);
    assert.equal(pushData1.newlyInserted, 4);
    assert.equal(pushData1.alreadyExisted, 0);
    assert.equal(pushData1.cashDrawerTotal, 1000);
    assert.equal(pushData1.cardOnlineTotal, 250);

    // Segundo envío Push (re-sincronización del mismo día): debe ser 100% idempotente
    const pushRes2 = await fetch(`${baseUrl}/api/cash-sessions/sync-reservas`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": VALID_API_KEY,
      },
      body: JSON.stringify(payload),
    });
    assert.equal(pushRes2.status, 200);
    const pushData2 = await pushRes2.json();
    assert.equal(pushData2.newlyInserted, 0, "No debe duplicar transacciones ya sincronizadas");
    assert.equal(pushData2.alreadyExisted, 4);
    assert.equal(pushData2.totalInSession, 4);
    assert.equal(pushData2.cashDrawerTotal, 1000, "El efectivo en caja debe mantenerse exacto en $1,000");
  });

  it("5. Conectividad real con Supabase (tablas bookings, receipt_numbers, special_bookings, courts)", async () => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { data: courts, error: courtsError } = await supabase
      .from("courts")
      .select("id, name, court_type")
      .limit(5);

    assert.equal(courtsError, null, "La consulta a courts en Supabase no debe arrojar error");
    assert.ok(Array.isArray(courts), "Debe retornar un arreglo de canchas");
    assert.ok(courts.length > 0, "Debe existir al menos una cancha registrada");

    // Verificar consulta real del día en formato de sincronización Control CDV
    const startUTC = "2026-11-24T06:00:00.000Z";
    const endUTC = "2026-11-25T05:59:59.999Z";
    const { data: dayBookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("id, court_id, user_id, start_time, end_time, status, amount, actual_amount_charged, payment_method, payment_gateway, payment_completed_at, booking_made_at")
      .in("status", ["paid", "cancelled"])
      .gte("start_time", startUTC)
      .lte("start_time", endUTC);

    assert.equal(bookingsError, null, "La consulta a bookings para el corte del día no debe arrojar error");
    assert.ok(Array.isArray(dayBookings), "Debe retornar un arreglo de reservas del día");

    const mappedLive = dayBookings.map(mapRawRowToTransaction);
    const livePayload = buildPayloadFromTransactions(mappedLive, {
      selectedDate: "2026-11-24",
      startUTC,
      endUTC,
      operatorId: null,
      onlyCash: false,
    });
    assert.equal(livePayload.success, true);
    assert.equal(livePayload.source, "ace-booking-system");
    assert.equal(livePayload.event, "cash_cut_sync");
    assert.equal(typeof livePayload.summary.cash_ventanilla_total, "number");
    assert.equal(typeof livePayload.summary.grand_total, "number");
  });

  it("6. Valida reglas de seguridad de Webhooks para Control CDV (permite LAN/localhost en cash_cut_sync y bloquea en otros eventos)", async () => {
    const validationSource = fs.readFileSync(
      path.join(projectRoot, "src/utils/validation.ts"),
      "utf8"
    );
    assert.match(validationSource, /'cash_cut_sync'/, "validation.ts debe incluir el evento cash_cut_sync");
    assert.match(validationSource, /allowLocalNetwork/, "validation.ts debe soportar allowLocalNetwork para Control CDV en red local");
  });
});
