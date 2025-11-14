import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, RefreshCw, Download, AlertTriangle, Eye, Copy, Check } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { usePaymentLogs, type LogFilters, type PaymentLog } from "@/hooks/use-payment-logs";
import { useToast } from "@/hooks/use-toast";

export function PaymentLogsViewer() {
  const { toast } = useToast();
  const [filters, setFilters] = useState<LogFilters>({
    startDate: format(new Date(Date.now() - 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    function: undefined,
    status: undefined,
    search: "",
    autoRefresh: false
  });

  const [selectedLog, setSelectedLog] = useState<PaymentLog | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data, isLoading, refetch, error } = usePaymentLogs(filters);

  const handleFilterChange = (key: keyof LogFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      startDate: format(new Date(Date.now() - 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
      function: undefined,
      status: undefined,
      search: "",
      autoRefresh: false
    });
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({
      title: "Copiado",
      description: "ID copiado al portapapeles"
    });
  };

  const exportToCSV = () => {
    if (!data?.logs) return;

    const csvContent = [
      ["Timestamp", "Función", "Session ID", "Booking ID", "Estado", "Duración (ms)", "Error"].join(","),
      ...data.logs.map(log => [
        format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss'),
        log.function,
        log.sessionId,
        log.bookingId || "N/A",
        log.status,
        log.duration || "N/A",
        log.errorMessage ? `"${log.errorMessage.replace(/"/g, '""')}"` : "N/A"
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `payment-logs-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;
    link.click();

    toast({
      title: "Exportado",
      description: "Logs exportados a CSV exitosamente"
    });
  };

  const getFunctionBadgeColor = (func: string) => {
    switch (func) {
      case "verify-payment":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "verify-paypal-payment":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "verify-mercadopago-payment":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">✅ Exitoso</Badge>;
      case "error":
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">❌ Error</Badge>;
      case "not_found":
        return <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20">⚠️ No encontrado</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-500/20">❓ Desconocido</Badge>;
    }
  };

  const getAlerts = () => {
    if (!data) return [];
    
    const alerts = [];
    const last24h = data.logs.filter(log => 
      new Date(log.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000
    );

    const failed = last24h.filter(l => l.status === "error");
    if (failed.length >= 3) {
      alerts.push(`${failed.length} verificaciones fallidas en las últimas 24h`);
    }

    const slow = last24h.filter(l => l.duration && l.duration > 5000);
    if (slow.length >= 2) {
      alerts.push(`${slow.length} verificaciones tardaron más de 5 segundos`);
    }

    const orphaned = data.logs.filter(l => l.status === "not_found");
    if (orphaned.length > 0) {
      alerts.push(`${orphaned.length} posibles pagos huérfanos detectados`);
    }

    return alerts;
  };

  const alerts = getAlerts();

  return (
    <div className="space-y-6">
      {/* Alertas */}
      {alerts.length > 0 && (
        <Alert className="border-orange-500/50 bg-orange-500/10">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          <AlertDescription>
            <div className="font-semibold mb-2">Alertas detectadas:</div>
            <ul className="list-disc list-inside space-y-1">
              {alerts.map((alert, i) => (
                <li key={i} className="text-sm">{alert}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Métricas */}
      {data?.summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Verificaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.summary.totalVerifications}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Exitosas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{data.summary.successful}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Fallidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{data.summary.failed + data.summary.notFound}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Duración Promedio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.summary.avgDuration}ms</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🔎 Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label>Fecha Inicio</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange("startDate", e.target.value)}
              />
            </div>
            
            <div>
              <Label>Fecha Fin</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
              />
            </div>
            
            <div>
              <Label>Función</Label>
              <Select value={filters.function} onValueChange={(v) => handleFilterChange("function", v === "all" ? undefined : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="verify-payment">Stripe</SelectItem>
                  <SelectItem value="verify-paypal-payment">PayPal</SelectItem>
                  <SelectItem value="verify-mercadopago-payment">MercadoPago</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Estado</Label>
              <Select value={filters.status} onValueChange={(v) => handleFilterChange("status", v === "all" ? undefined : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="success">Exitosos</SelectItem>
                  <SelectItem value="error">Fallidos</SelectItem>
                  <SelectItem value="not_found">No encontrados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Buscar (Session ID / Booking ID)</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por ID..."
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="autoRefresh"
                checked={filters.autoRefresh}
                onCheckedChange={(checked) => handleFilterChange("autoRefresh", checked)}
              />
              <Label htmlFor="autoRefresh" className="cursor-pointer">
                🔄 Auto-refresh (30s)
              </Label>
            </div>

            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>

            <Button variant="outline" size="sm" onClick={handleClearFilters}>
              Limpiar
            </Button>

            <Button variant="outline" size="sm" onClick={exportToCSV} disabled={!data?.logs || data.logs.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Error al cargar logs: {error.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Tabla de Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📋 Logs de Verificación</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !data?.logs || data.logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay logs en el rango seleccionado
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Función</TableHead>
                    <TableHead>Session ID</TableHead>
                    <TableHead>Booking ID</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Duración</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.logs.map((log, index) => (
                    <TableRow key={index}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: es })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getFunctionBadgeColor(log.function)}>
                          {log.function === "verify-payment" ? "Stripe" :
                           log.function === "verify-paypal-payment" ? "PayPal" :
                           log.function === "verify-mercadopago-payment" ? "MercadoPago" : "Unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-mono truncate max-w-[120px]">{log.sessionId}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleCopyId(log.sessionId)}
                          >
                            {copiedId === log.sessionId ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.bookingId ? (
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-mono truncate max-w-[100px]">{log.bookingId}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleCopyId(log.bookingId!)}
                            >
                              {copiedId === log.bookingId ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell>
                        <span className={log.duration && log.duration > 3000 ? "text-orange-500 font-semibold" : ""}>
                          {log.duration ? `${log.duration}ms` : "N/A"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalles */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles del Log</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Timestamp</Label>
                  <p className="font-mono text-sm">{format(new Date(selectedLog.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: es })}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Función</Label>
                  <p>{selectedLog.function}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Session ID</Label>
                  <p className="font-mono text-xs break-all">{selectedLog.sessionId}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Booking ID</Label>
                  <p className="font-mono text-xs break-all">{selectedLog.bookingId || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Estado</Label>
                  <div>{getStatusBadge(selectedLog.status)}</div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Duración</Label>
                  <p>{selectedLog.duration ? `${selectedLog.duration}ms` : "N/A"}</p>
                </div>
              </div>
              
              {selectedLog.errorMessage && (
                <div>
                  <Label className="text-sm text-muted-foreground">Mensaje de Error</Label>
                  <pre className="mt-2 rounded-md bg-red-500/10 p-4 text-xs overflow-x-auto">
                    {selectedLog.errorMessage}
                  </pre>
                </div>
              )}

              {Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <Label className="text-sm text-muted-foreground">Metadata</Label>
                  <pre className="mt-2 rounded-md bg-muted p-4 text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
