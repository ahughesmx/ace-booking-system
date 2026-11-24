import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  RefreshCw,
  Send,
  Download,
  Copy,
  CheckCircle2,
  AlertCircle,
  Server,
  Code2,
  DollarSign,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import {
  ControlCdvSyncPayload,
  CONTROL_CDV_PULL_ENDPOINT,
  fetchDailyTransactionsForControlCdv,
  pushTransactionsToControlCdv,
  downloadControlCdvSyncJson,
  getControlCdvConfig,
  saveControlCdvConfig,
  getLastControlCdvSync,
  LastSyncRecord,
} from "@/services/control-cdv-sync";

interface ControlCdvSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: string;
  operatorId?: string | null;
  onSyncCompleted?: (record: LastSyncRecord | null) => void;
}

export function ControlCdvSyncDialog({
  open,
  onOpenChange,
  selectedDate,
  operatorId,
  onSyncCompleted,
}: ControlCdvSyncDialogProps) {
  const [loadingPayload, setLoadingPayload] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [payload, setPayload] = useState<ControlCdvSyncPayload | null>(null);
  const [onlyCash, setOnlyCash] = useState(false);
  const [pushUrl, setPushUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [syncResult, setSyncResult] = useState<{
    ok: boolean;
    message: string;
    details?: Array<{ name: string; url: string; ok: boolean; status: number; message?: string }>;
  } | null>(null);

  useEffect(() => {
    const cfg = getControlCdvConfig();
    setPushUrl(cfg.pushUrl);
    setApiKey(cfg.apiKey);
    setOnlyCash(cfg.onlyCashDefault);
  }, [open]);

  const loadPreview = async (overrideOnlyCash?: boolean) => {
    setLoadingPayload(true);
    setSyncResult(null);
    try {
      const effectiveOnlyCash =
        overrideOnlyCash !== undefined ? overrideOnlyCash : onlyCash;
      const data = await fetchDailyTransactionsForControlCdv({
        selectedDate,
        operatorId,
        onlyCash: effectiveOnlyCash,
      });
      setPayload(data);
    } catch (error: any) {
      console.error("Error cargando movimientos para Control CDV:", error);
      toast.error(
        "No se pudieron cargar las transacciones para sincronización: " +
          (error?.message || "Error desconocido")
      );
    } finally {
      setLoadingPayload(false);
    }
  };

  useEffect(() => {
    if (open && selectedDate) {
      loadPreview();
    }
  }, [open, selectedDate, operatorId]);

  const handleToggleOnlyCash = (checked: boolean) => {
    setOnlyCash(checked);
    saveControlCdvConfig({
      pushUrl,
      apiKey,
      onlyCashDefault: checked,
    });
    loadPreview(checked);
  };

  const handleSaveConnectionSettings = () => {
    saveControlCdvConfig({
      pushUrl: pushUrl.trim(),
      apiKey: apiKey.trim(),
      onlyCashDefault: onlyCash,
    });
    toast.success("Configuración de conexión con Control CDV guardada");
  };

  const handlePushToControlCdv = async () => {
    if (!payload) return;
    setPushing(true);
    setSyncResult(null);

    saveControlCdvConfig({
      pushUrl: pushUrl.trim(),
      apiKey: apiKey.trim(),
      onlyCashDefault: onlyCash,
    });

    try {
      const result = await pushTransactionsToControlCdv({
        payload,
        overrideUrl: pushUrl.trim(),
        overrideApiKey: apiKey.trim(),
      });

      const allOk = result.deliveredCount > 0;
      setSyncResult({
        ok: allOk,
        message: allOk
          ? `Se enviaron ${payload.summary.total_transactions} transacciones exitosamente a Control CDV.`
          : "No se pudo entregar el lote al endpoint de Control CDV. Revisa el detalle abajo.",
        details: result.targets,
      });

      if (allOk) {
        toast.success("Transacciones sincronizadas con Control CDV");
      } else {
        toast.error("Error al conectar con el endpoint de Control CDV");
      }

      onSyncCompleted?.(getLastControlCdvSync());
    } catch (error: any) {
      setSyncResult({
        ok: false,
        message: error?.message || "Error al enviar transacciones a Control CDV",
      });
      toast.error(error?.message || "Error al sincronizar con Control CDV");
    } finally {
      setPushing(false);
    }
  };

  const pullUrlWithParams = `${CONTROL_CDV_PULL_ENDPOINT}?date=${selectedDate}${
    operatorId ? `&operator_id=${operatorId}` : ""
  }${onlyCash ? "&only_cash=true" : ""}`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado al portapapeles`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[850px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Server className="h-5 w-5 text-blue-600" />
            Sincronización de Transacciones con Control CDV (Corte de Caja)
          </DialogTitle>
          <DialogDescription>
            Consulta, exporta o envía todas las transacciones del día ({selectedDate}) para integrarlas en el corte de caja de recepción en Control CDV.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Resumen financiero de movimientos a sincronizar */}
          {payload && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border bg-green-50/70 border-green-200 p-3">
                <div className="text-xs font-medium text-green-800">
                  Efectivo en Ventanilla (Caja)
                </div>
                <div className="text-xl font-bold text-green-700 mt-1">
                  {formatCurrency(payload.summary.cash_ventanilla_total)}
                </div>
                <div className="text-[11px] text-green-700/80">
                  {payload.summary.cash_ventanilla_count} cobro(s) recepción
                </div>
              </div>

              <div className="rounded-lg border bg-blue-50/70 border-blue-200 p-3">
                <div className="text-xs font-medium text-blue-800">
                  Pasarela En Línea
                </div>
                <div className="text-xl font-bold text-blue-700 mt-1">
                  {formatCurrency(payload.summary.online_total)}
                </div>
                <div className="text-[11px] text-blue-700/80">
                  {payload.summary.online_count} cobro(s) web
                </div>
              </div>

              <div className="rounded-lg border bg-slate-50 border-slate-200 p-3">
                <div className="text-xs font-medium text-slate-700">
                  Total General del Día
                </div>
                <div className="text-xl font-bold text-slate-900 mt-1">
                  {formatCurrency(payload.summary.grand_total)}
                </div>
                <div className="text-[11px] text-slate-500">
                  {payload.summary.total_transactions} movimiento(s)
                </div>
              </div>

              <div className="rounded-lg border bg-amber-50/60 border-amber-200 p-3">
                <div className="text-xs font-medium text-amber-800">
                  Estatus Reservas
                </div>
                <div className="text-sm font-bold text-amber-900 mt-1">
                  {payload.summary.active_transactions} vigentes
                </div>
                <div className="text-[11px] text-amber-700">
                  {payload.summary.cancelled_transactions} canceladas (sin dev.)
                </div>
              </div>
            </div>
          )}

          {/* Filtro rápido: Todas vs Solo Ventanilla */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 bg-muted/30">
            <div className="space-y-0.5">
              <Label htmlFor="only-cash-switch" className="text-sm font-medium">
                Incluir únicamente cobros de Ventanilla / Efectivo
              </Label>
              <p className="text-xs text-muted-foreground">
                Desactivado (recomendado): envía todas las transacciones (Ventanilla + En línea + Especiales) marcando cuáles afectan el efectivo en gaveta (`include_in_cash_drawer`).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="only-cash-switch"
                checked={onlyCash}
                onCheckedChange={handleToggleOnlyCash}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadPreview()}
                disabled={loadingPayload}
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 mr-1.5 ${loadingPayload ? "animate-spin" : ""}`}
                />
                Actualizar
              </Button>
            </div>
          </div>

          <Tabs defaultValue="transactions" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="transactions">
                Movimientos ({payload?.transactions.length || 0})
              </TabsTrigger>
              <TabsTrigger value="connection">
                Conexión Push / Pull Control CDV
              </TabsTrigger>
              <TabsTrigger value="json">
                Payload JSON (Contrato API)
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Tabla de movimientos a sincronizar */}
            <TabsContent value="transactions" className="space-y-3 mt-3">
              <div className="border rounded-md max-h-[320px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Folio / Hora</TableHead>
                      <TableHead>Acción / Socio</TableHead>
                      <TableHead>Concepto / Cancha</TableHead>
                      <TableHead>Canal</TableHead>
                      <TableHead>Operador</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingPayload ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Cargando movimientos del día...
                        </TableCell>
                      </TableRow>
                    ) : !payload || payload.transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No hay movimientos registrados para la fecha {selectedDate}
                        </TableCell>
                      </TableRow>
                    ) : (
                      payload.transactions.map((tx) => (
                        <TableRow key={tx.external_transaction_id}>
                          <TableCell className="text-xs">
                            <div className="font-mono font-semibold">{tx.folio}</div>
                            <div className="text-muted-foreground">
                              {tx.payment_date_cdmx} {tx.payment_time_cdmx}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="font-medium">{tx.member.full_name}</div>
                            <div className="text-muted-foreground">
                              Acción: {tx.member.action_number || "S/N"}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div>{tx.court.name}</div>
                            <div className="text-muted-foreground">
                              {tx.reservation.date_cdmx} ({tx.reservation.start_time_cdmx} -{" "}
                              {tx.reservation.end_time_cdmx})
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            <Badge
                              variant={
                                tx.payment_channel === "VENTANILLA" ? "default" : "secondary"
                              }
                              className={
                                tx.payment_channel === "VENTANILLA"
                                  ? "bg-green-600 hover:bg-green-700"
                                  : ""
                              }
                            >
                              {tx.payment_channel === "VENTANILLA"
                                ? "Efectivo (Caja)"
                                : `Online (${tx.payment_gateway})`}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {tx.operator.operator_name}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-xs">
                            {formatCurrency(tx.amount)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* TAB 2: Configuración Pull y Push */}
            <TabsContent value="connection" className="space-y-4 mt-3">
              <div className="rounded-lg border p-4 space-y-3 bg-blue-50/40 border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-blue-900">
                      1. Modo Pull (Control CDV consulta a Reservas CDV)
                    </h4>
                    <p className="text-xs text-blue-700">
                      El sistema Control CDV puede conectarse en cualquier momento a este endpoint HTTP GET/POST para obtener todas las transacciones del día:
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(pullUrlWithParams, "URL de sincronización Pull")}
                  >
                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                    Copiar URL
                  </Button>
                </div>
                <Input
                  readOnly
                  value={pullUrlWithParams}
                  className="font-mono text-xs bg-white"
                />
                <p className="text-[11px] text-blue-800">
                  Parámetros soportados: <code>?date=YYYY-MM-DD</code>, <code>&amp;start_date=YYYY-MM-DD</code>, <code>&amp;end_date=YYYY-MM-DD</code>, <code>&amp;operator_id=UUID</code>, <code>&amp;only_cash=true</code>. Autenticación vía header <code>x-api-key</code> o <code>Authorization: Bearer &lt;token&gt;</code>.
                </p>
              </div>

              <div className="rounded-lg border p-4 space-y-3">
                <h4 className="text-sm font-semibold">
                  2. Modo Push (Enviar desde Reservas CDV hacia Control CDV)
                </h4>
                <p className="text-xs text-muted-foreground">
                  Configura la URL del endpoint receptor en Control CDV (o registra un webhook de tipo <code>cash_cut_sync</code> en Admin → Webhooks):
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="control-cdv-url" className="text-xs">
                      URL receptora en Control CDV
                    </Label>
                    <Input
                      id="control-cdv-url"
                      value={pushUrl}
                      onChange={(e) => setPushUrl(e.target.value)}
                      placeholder="ej: http://localhost:4000/api/cash-sessions/sync-reservas o https://..."
                      className="text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="control-cdv-apikey" className="text-xs">
                      Token / API Key para Control CDV (Opcional - se envía en x-api-key y Authorization Bearer)
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="control-cdv-apikey"
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Token o API Key de Control CDV"
                        className="text-xs font-mono"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleSaveConnectionSettings}
                      >
                        Guardar URL
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: Payload JSON */}
            <TabsContent value="json" className="space-y-2 mt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Code2 className="h-3.5 w-3.5" />
                  Estructura JSON enviada y devuelta por el endpoint de sincronización:
                </span>
                {payload && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(JSON.stringify(payload, null, 2), "Payload JSON")
                    }
                  >
                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                    Copiar JSON
                  </Button>
                )}
              </div>
              <pre className="p-3 rounded-md bg-slate-950 text-slate-100 text-xs overflow-auto max-h-[300px] font-mono">
                {payload ? JSON.stringify(payload, null, 2) : "Cargando..."}
              </pre>
            </TabsContent>
          </Tabs>

          {/* Resultado de envío Push */}
          {syncResult && (
            <div
              className={`rounded-lg border p-3 text-xs ${
                syncResult.ok
                  ? "bg-green-50 border-green-200 text-green-900"
                  : "bg-red-50 border-red-200 text-red-900"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {syncResult.ok ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <span>{syncResult.message}</span>
              </div>
              {syncResult.details && syncResult.details.length > 0 && (
                <div className="mt-2 space-y-1 pl-6">
                  {syncResult.details.map((d, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="font-mono truncate max-w-[450px]">
                        {d.name}: {d.url}
                      </span>
                      <Badge variant={d.ok ? "default" : "destructive"}>
                        {d.status ? `HTTP ${d.status}` : "Sin conexión"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-wrap items-center justify-between gap-2 sm:justify-between">
          <div className="flex gap-2">
            {payload && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  downloadControlCdvSyncJson(payload);
                  toast.success("Archivo JSON de sincronización descargado");
                }}
              >
                <Download className="h-4 w-4 mr-1.5" />
                Descargar JSON
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
            <Button
              size="sm"
              onClick={handlePushToControlCdv}
              disabled={pushing || loadingPayload || !payload}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Send className="h-4 w-4 mr-1.5" />
              {pushing ? "Enviando a Control CDV..." : "Enviar a Control CDV (Push)"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
