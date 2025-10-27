import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Download, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { exportToPDF } from "@/utils/pdf-export";

interface BookingReport {
  id: string;
  start_time: string;
  booking_made_at: string;
  payment_completed_at: string | null;
  payment_method: string;
  actual_amount_charged: number | null;
  amount: number | null;
  processed_by: string | null;
  user: {
    full_name: string;
    member_id: string;
  } | null;
  court: {
    name: string;
  };
  processed_by_user?: {
    full_name: string;
  } | null;
}

export function DateRangeReport() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<BookingReport[]>([]);
  
  // Filters
  const [startDate, setStartDate] = useState<string>(
    format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>("all");
  const [membershipFilter, setMembershipFilter] = useState<string>("");
  const [userFilter, setUserFilter] = useState<string>("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
  
  // Operators list
  const [operators, setOperators] = useState<Array<{ id: string; full_name: string }>>([]);

  useEffect(() => {
    fetchOperators();
  }, []);

  const fetchOperators = async () => {
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "operador");

    if (userRoles && userRoles.length > 0) {
      const operatorIds = userRoles.map((ur) => ur.user_id);
      
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", operatorIds);

      if (profiles) {
        setOperators(profiles);
      }
    }
  };

  const fetchReport = async () => {
    if (!startDate || !endDate) {
      toast({
        title: "Error",
        description: "Debes seleccionar un rango de fechas",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      let query = supabase
        .from("bookings")
        .select(`
          id,
          start_time,
          booking_made_at,
          payment_completed_at,
          payment_method,
          actual_amount_charged,
          amount,
          processed_by,
          user:profiles!bookings_user_id_fkey_profiles(full_name, member_id),
          court:courts(name),
          processed_by_user:profiles!bookings_processed_by_fkey(full_name)
        `)
        .eq("status", "paid")
        .gte("payment_completed_at", `${startDate}T00:00:00`)
        .lte("payment_completed_at", `${endDate}T23:59:59`)
        .order("payment_completed_at", { ascending: false });

      // Apply filters
      if (selectedOperatorId !== "all") {
        query = query.eq("processed_by", selectedOperatorId);
      }

      if (membershipFilter) {
        query = query.ilike("profiles.member_id", `%${membershipFilter}%`);
      }

      if (userFilter) {
        query = query.ilike("profiles.full_name", `%${userFilter}%`);
      }

      if (paymentMethodFilter !== "all") {
        if (paymentMethodFilter === "online") {
          query = query.eq("payment_method", "online");
        } else if (paymentMethodFilter === "cash") {
          query = query.in("payment_method", ["cash", "efectivo"]);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform data to match expected type
      const transformedData = (data || []).map((item: any) => ({
        ...item,
        user: Array.isArray(item.user) ? item.user[0] : item.user,
        processed_by_user: Array.isArray(item.processed_by_user) 
          ? item.processed_by_user[0] 
          : item.processed_by_user,
      }));

      setBookings(transformedData);

      if (!data || data.length === 0) {
        toast({
          title: "Sin resultados",
          description: "No se encontraron reservaciones con los filtros aplicados",
        });
      }
    } catch (error) {
      console.error("Error fetching report:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar el reporte",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    const onlineTotal = bookings
      .filter((b) => b.payment_method === "online")
      .reduce((sum, b) => sum + (b.actual_amount_charged || b.amount || 0), 0);

    const cashTotal = bookings
      .filter((b) => ["cash", "efectivo"].includes(b.payment_method))
      .reduce((sum, b) => sum + (b.actual_amount_charged || b.amount || 0), 0);

    return {
      online: onlineTotal,
      cash: cashTotal,
      total: onlineTotal + cashTotal,
      count: bookings.length,
    };
  };

  const exportToCSV = () => {
    const headers = [
      "Fecha Reservación",
      "Fecha Pago",
      "Cliente",
      "Membresía",
      "Cancha",
      "Método Pago",
      "Monto",
      "Procesado Por",
    ];

    const rows = bookings.map((booking) => [
      format(new Date(booking.start_time), "dd/MM/yyyy HH:mm"),
      format(
        new Date(booking.payment_completed_at || booking.booking_made_at),
        "dd/MM/yyyy HH:mm"
      ),
      booking.user?.full_name || "N/A",
      booking.user?.member_id || "N/A",
      booking.court.name,
      booking.payment_method === "online" ? "Sistema" : "Ventanilla",
      `$${(booking.actual_amount_charged || booking.amount || 0).toFixed(2)}`,
      booking.processed_by_user?.full_name || "Sistema",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `reporte-reservaciones-${startDate}-${endDate}.csv`;
    link.click();

    toast({
      title: "Exportado",
      description: "El reporte se ha exportado a CSV exitosamente",
    });
  };

  const exportToPDFReport = () => {
    const totals = calculateTotals();

    const columns = [
      { header: "Fecha Reservación", dataKey: "reservation_date" },
      { header: "Fecha Pago", dataKey: "payment_date" },
      { header: "Cliente", dataKey: "client" },
      { header: "Membresía", dataKey: "membership" },
      { header: "Cancha", dataKey: "court" },
      { header: "Método", dataKey: "method" },
      { header: "Monto", dataKey: "amount" },
      { header: "Procesado Por", dataKey: "processed_by" },
    ];

    const data = bookings.map((booking) => ({
      reservation_date: format(new Date(booking.start_time), "dd/MM/yyyy HH:mm"),
      payment_date: format(
        new Date(booking.payment_completed_at || booking.booking_made_at),
        "dd/MM/yyyy HH:mm"
      ),
      client: booking.user?.full_name || "N/A",
      membership: booking.user?.member_id || "N/A",
      court: booking.court.name,
      method: booking.payment_method === "online" ? "Sistema" : "Ventanilla",
      amount: `$${(booking.actual_amount_charged || booking.amount || 0).toFixed(2)}`,
      processed_by: booking.processed_by_user?.full_name || "Sistema",
    }));

    exportToPDF({
      title: "Reporte de Reservaciones por Rango de Fechas",
      subtitle: `Período: ${format(new Date(startDate), "dd/MM/yyyy")} - ${format(
        new Date(endDate),
        "dd/MM/yyyy"
      )}`,
      columns,
      data,
      summary: [
        { label: "Total Sistema (Online)", value: `$${totals.online.toFixed(2)}` },
        { label: "Total Ventanilla (Efectivo)", value: `$${totals.cash.toFixed(2)}` },
        { label: "Total General", value: `$${totals.total.toFixed(2)}` },
        { label: "Total Reservaciones", value: totals.count.toString() },
      ],
      fileName: `reporte-reservaciones-${startDate}-${endDate}.pdf`,
      orientation: "landscape",
    });

    toast({
      title: "Exportado",
      description: "El reporte se ha exportado a PDF exitosamente",
    });
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Búsqueda</CardTitle>
          <CardDescription>
            Selecciona los criterios para generar el reporte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Fecha Inicio</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">Fecha Fin</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="operator">Operador</Label>
              <Select value={selectedOperatorId} onValueChange={setSelectedOperatorId}>
                <SelectTrigger id="operator">
                  <SelectValue placeholder="Todos los operadores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los operadores</SelectItem>
                  {operators.map((op) => (
                    <SelectItem key={op.id} value={op.id}>
                      {op.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="membership">Membresía</Label>
              <Input
                id="membership"
                placeholder="Buscar por membresía..."
                value={membershipFilter}
                onChange={(e) => setMembershipFilter(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user">Usuario</Label>
              <Input
                id="user"
                placeholder="Buscar por nombre..."
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-method">Medio de Pago</Label>
              <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                <SelectTrigger id="payment-method">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="online">Sistema (Online)</SelectItem>
                  <SelectItem value="cash">Ventanilla (Efectivo)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={fetchReport} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cargando...
                </>
              ) : (
                "Generar Reporte"
              )}
            </Button>

            {bookings.length > 0 && (
              <>
                <Button onClick={exportToCSV} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Exportar CSV
                </Button>
                <Button onClick={exportToPDFReport} variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  Exportar PDF
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {bookings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Sistema (Online)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totals.online.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Ventanilla (Efectivo)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totals.cash.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total General</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totals.total.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Reservaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.count}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Table */}
      {bookings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados</CardTitle>
            <CardDescription>
              {bookings.length} reservaciones encontradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha Reservación</TableHead>
                    <TableHead>Fecha Pago</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Membresía</TableHead>
                    <TableHead>Cancha</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead>Procesado Por</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell>
                        {format(new Date(booking.start_time), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        {format(
                          new Date(booking.payment_completed_at || booking.booking_made_at),
                          "dd/MM/yyyy HH:mm"
                        )}
                      </TableCell>
                      <TableCell>{booking.user?.full_name || "N/A"}</TableCell>
                      <TableCell>{booking.user?.member_id || "N/A"}</TableCell>
                      <TableCell>{booking.court.name}</TableCell>
                      <TableCell>
                        {booking.payment_method === "online" ? "Sistema" : "Ventanilla"}
                      </TableCell>
                      <TableCell className="text-right">
                        ${(booking.actual_amount_charged || booking.amount || 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {booking.processed_by_user?.full_name || "Sistema"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
