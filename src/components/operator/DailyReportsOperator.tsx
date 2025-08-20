import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Calendar, DollarSign, CreditCard, Hash, TrendingUp, FileText } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { exportToPDF, formatCurrency } from "@/utils/pdf-export";
import { useAuth } from "@/components/AuthProvider";
import { getStartOfTodayMexicoCityISO, getEndOfTodayMexicoCityISO, toMexicoCityTime, fromMexicoCityTimeToUTC } from "@/utils/timezone";

interface DailyBooking {
  id: string;
  start_time: string;
  end_time: string;
  actual_amount_charged: number;
  currency: string;
  payment_method: string;
  booking_made_at: string;
  user: {
    full_name: string;
    member_id: string;
  } | null;
  court: {
    name: string;
    court_type: string;
  };
  processed_by_user: {
    full_name: string;
  } | null;
}

interface PaymentSummary {
  cashTotal: number;
  onlineTotal: number;
  total: number;
  count: number;
}

export function DailyReportsOperator() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<DailyBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [summary, setSummary] = useState<PaymentSummary>({ cashTotal: 0, onlineTotal: 0, total: 0, count: 0 });

  const fetchDailyBookings = async () => {
    setLoading(true);
    try {
      // Crear fechas usando timezone de México correctamente
      const selectedMexicoDate = new Date(selectedDate + 'T00:00:00');
      
      // Crear inicio y fin del día en tiempo de México
      const startOfDayMexico = new Date(selectedMexicoDate);
      startOfDayMexico.setHours(0, 0, 0, 0);
      
      const endOfDayMexico = new Date(selectedMexicoDate);
      endOfDayMexico.setHours(23, 59, 59, 999);
      
      // Convertir a UTC usando las utilidades de timezone
      const startOfDayUTC = fromMexicoCityTimeToUTC(startOfDayMexico).toISOString();
      const endOfDayUTC = fromMexicoCityTimeToUTC(endOfDayMexico).toISOString();

      console.log('Filtro de fechas corregido:', {
        selectedDate,
        startOfDayMexico: startOfDayMexico.toISOString(),
        endOfDayMexico: endOfDayMexico.toISOString(),
        startOfDayUTC,
        endOfDayUTC
      });

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          start_time,
          end_time,
          actual_amount_charged,
          currency,
          payment_method,
          booking_made_at,
          user_id,
          court_id,
          processed_by
        `)
        .eq('status', 'paid')
        .gte('start_time', startOfDayUTC)
        .lte('start_time', endOfDayUTC)
        .not('actual_amount_charged', 'is', null)
        .order('start_time', { ascending: false });

      if (error) throw error;

      // Get user and court information separately
      const bookingsWithDetails = await Promise.all(
        (data || []).map(async (booking) => {
          const [userResponse, courtResponse, processedByResponse] = await Promise.all([
            booking.user_id 
              ? supabase.from('profiles').select('full_name, member_id').eq('id', booking.user_id).single()
              : Promise.resolve({ data: null }),
            booking.court_id
              ? supabase.from('courts').select('name, court_type').eq('id', booking.court_id).single()
              : Promise.resolve({ data: null }),
            booking.processed_by
              ? supabase.from('profiles').select('full_name').eq('id', booking.processed_by).single()
              : Promise.resolve({ data: null })
          ]);

          return {
            ...booking,
            user: userResponse.data,
            court: courtResponse.data,
            processed_by_user: processedByResponse.data
          };
        })
      );

      setBookings(bookingsWithDetails);
      // Calculate summaries
      const cashTotal = bookingsWithDetails
        .filter(booking => booking.payment_method === 'cash' && booking.actual_amount_charged)
        .reduce((sum, booking) => sum + (booking.actual_amount_charged || 0), 0);
      
      const onlineTotal = bookingsWithDetails
        .filter(booking => booking.payment_method === 'online' && booking.actual_amount_charged)
        .reduce((sum, booking) => sum + (booking.actual_amount_charged || 0), 0);
      
      const total = bookingsWithDetails
        .filter(booking => booking.actual_amount_charged)
        .reduce((sum, booking) => sum + (booking.actual_amount_charged || 0), 0);

      console.log('Cálculo de totales:', {
        bookingsWithDetails: bookingsWithDetails.map(b => ({
          id: b.id,
          payment_method: b.payment_method,
          actual_amount_charged: b.actual_amount_charged
        })),
        cashTotal,
        onlineTotal,
        total
      });

      setSummary({
        cashTotal: cashTotal,
        onlineTotal: onlineTotal,
        total: total,
        count: bookingsWithDetails.length
      });

    } catch (error) {
      console.error('Error fetching daily bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyBookings();
  }, [selectedDate]);

  const exportToCSV = () => {
    const headers = ['Fecha', 'Hora', 'Cliente', 'Membresía', 'Cancha', 'Método Pago', 'Procesado Por', 'Monto'];
    const csvData = bookings.map(booking => [
      format(new Date(booking.start_time), 'dd/MM/yyyy', { locale: es }),
      format(new Date(booking.start_time), 'HH:mm', { locale: es }),
      booking.user?.full_name || 'N/A',
      booking.user?.member_id || 'N/A',
      booking.court?.name || 'N/A',
      booking.payment_method === 'cash' ? 'Efectivo' : 'En Línea',
      booking.processed_by_user?.full_name || 'Sistema',
      `$${booking.actual_amount_charged?.toFixed(2) || '0.00'}`
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `cobros_diarios_${selectedDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDFReport = () => {
    const pdfData = bookings.map(booking => ({
      fecha: format(new Date(booking.start_time), 'dd/MM/yyyy', { locale: es }),
      hora: `${format(new Date(booking.start_time), 'HH:mm', { locale: es })} - ${format(new Date(booking.end_time), 'HH:mm', { locale: es })}`,
      cliente: booking.user?.full_name || 'N/A',
      membresia: booking.user?.member_id || 'N/A',
      cancha: booking.court?.name || 'N/A',
      metodo_pago: booking.payment_method === 'cash' ? 'Efectivo' : 'En línea',
      procesado_por: booking.processed_by_user?.full_name || 'Sistema',
      monto: booking.actual_amount_charged || 0
    }));

    exportToPDF({
      title: 'Reporte de Cobros del Día',
      subtitle: `Fecha: ${format(new Date(selectedDate), 'dd/MM/yyyy', { locale: es })}`,
      data: pdfData,
      columns: [
        { header: 'Fecha', dataKey: 'fecha', width: 22 },
        { header: 'Hora', dataKey: 'hora', width: 28 },
        { header: 'Cliente', dataKey: 'cliente', width: 35 },
        { header: 'Membresía', dataKey: 'membresia', width: 25 },
        { header: 'Cancha', dataKey: 'cancha', width: 25 },
        { header: 'Método', dataKey: 'metodo_pago', width: 25 },
        { header: 'Procesado Por', dataKey: 'procesado_por', width: 30 },
        { header: 'Monto', dataKey: 'monto', width: 25 }
      ],
      summary: [
        { label: 'Total efectivo:', value: formatCurrency(summary.cashTotal) },
        { label: 'Total en línea:', value: formatCurrency(summary.onlineTotal) },
        { label: 'Total general:', value: formatCurrency(summary.total) },
        { label: 'Número de reservas:', value: summary.count.toString() }
      ],
      generatedBy: user?.user_metadata?.full_name || 'Operador',
      fileName: `cobros_diarios_${selectedDate}.pdf`
    });
  };

  const getPaymentMethodBadge = (method: string) => {
    return method === 'cash' ? (
      <Badge variant="secondary">Efectivo</Badge>
    ) : (
      <Badge variant="default">En Línea</Badge>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="date">Fecha:</Label>
          <Input
            id="date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto"
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
          <Button onClick={exportToPDFReport} variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Efectivo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${summary.cashTotal.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">En Línea</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ${summary.onlineTotal.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              ${summary.total.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Reservas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.count}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha/Hora</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Membresía</TableHead>
              <TableHead>Cancha</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Procesado Por</TableHead>
              <TableHead className="text-right">Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : bookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No hay cobros para la fecha seleccionada
                </TableCell>
              </TableRow>
            ) : (
              bookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{format(new Date(booking.start_time), 'dd/MM/yyyy', { locale: es })}</span>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(booking.start_time), 'HH:mm', { locale: es })} - 
                        {format(new Date(booking.end_time), 'HH:mm', { locale: es })}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{booking.user?.full_name || 'N/A'}</TableCell>
                  <TableCell>{booking.user?.member_id || 'N/A'}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{booking.court?.name || 'N/A'}</span>
                      <span className="text-sm text-muted-foreground capitalize">
                        {booking.court?.court_type || 'N/A'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{getPaymentMethodBadge(booking.payment_method)}</TableCell>
                  <TableCell className="text-sm">
                    {booking.processed_by_user?.full_name || 'Sistema'}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${booking.actual_amount_charged?.toFixed(2) || '0.00'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}