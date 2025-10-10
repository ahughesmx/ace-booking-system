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
import { exportToPDF } from "@/utils/pdf-export";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/components/AuthProvider";
import { getStartOfDateMexicoCityISO, getEndOfDateMexicoCityISO, toMexicoCityTime } from "@/utils/timezone";

interface DailyBooking {
  id: string;
  start_time: string;
  end_time: string;
  actual_amount_charged: number;
  amount: number;
  currency: string;
  payment_method: string;
  booking_made_at: string;
  status: string;
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
  paidCount: number;
  cancelledCount: number;
}

interface DailyReportsOperatorProps {
  operatorId?: string | null;
}

export function DailyReportsOperator({ operatorId }: DailyReportsOperatorProps = {}) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<DailyBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [summary, setSummary] = useState<PaymentSummary>({ 
    cashTotal: 0, 
    onlineTotal: 0, 
    total: 0, 
    count: 0, 
    paidCount: 0, 
    cancelledCount: 0 
  });

  const fetchDailyBookings = async () => {
    setLoading(true);
    try {
      // Usar funciones de timezone correctas para México
      const startOfDayUTC = getStartOfDateMexicoCityISO(selectedDate);
      const endOfDayUTC = getEndOfDateMexicoCityISO(selectedDate);

      console.log('🔍 DailyReports - Filtro de fechas:', {
        selectedDate,
        startOfDayUTC,
        endOfDayUTC,
        startOfDayMexicoTime: toMexicoCityTime(startOfDayUTC),
        endOfDayMexicoTime: toMexicoCityTime(endOfDayUTC),
        operatorId
      });

      // Usar JOIN para obtener datos en una consulta optimizada
      let query = supabase
        .from('bookings')
        .select(`
          id,
          start_time,
          end_time,
          actual_amount_charged,
          amount,
          currency,
          payment_method,
          booking_made_at,
          status,
          profiles:user_id (
            full_name,
            member_id
          ),
          courts (
            name,
            court_type
          ),
          processed_by_profiles:profiles!processed_by (
            full_name
          )
        `)
        .in('status', ['paid', 'cancelled'])
        .gte('booking_made_at', startOfDayUTC)
        .lte('booking_made_at', endOfDayUTC);
      
      // Si se especifica un operador, filtrar por processed_by
      if (operatorId) {
        query = query.eq('processed_by', operatorId);
      }
      
      const { data, error } = await query.order('start_time', { ascending: false });

      if (error) throw error;

      console.log('📊 DailyReports - Datos encontrados:', {
        count: data?.length || 0,
        firstBooking: data?.[0] ? {
          id: data[0].id,
          start_time: data[0].start_time,
          payment_method: data[0].payment_method,
          amount: data[0].actual_amount_charged
        } : null
      });

      // Mapear datos con estructura consistente
      const bookingsWithDetails = (data || []).map((booking) => ({
        ...booking,
        user: Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles,
        court: Array.isArray(booking.courts) ? booking.courts[0] : booking.courts,
        processed_by_user: Array.isArray(booking.processed_by_profiles) ? booking.processed_by_profiles[0] : booking.processed_by_profiles
      }));

      setBookings(bookingsWithDetails);
      
      // Calcular resúmenes con métodos de pago estandarizados
      const cashTotal = bookingsWithDetails
        .filter(booking => booking.payment_method === 'efectivo' || booking.payment_method === 'cash')
        .reduce((sum, booking) => {
          const amount = booking.actual_amount_charged || booking.amount || 0;
          return sum + amount;
        }, 0);
      
      const onlineTotal = bookingsWithDetails
        .filter(booking => booking.payment_method === 'online')
        .reduce((sum, booking) => {
          const amount = booking.actual_amount_charged || booking.amount || 0;
          return sum + amount;
        }, 0);
      
      const total = bookingsWithDetails
        .reduce((sum, booking) => {
          const amount = booking.actual_amount_charged || booking.amount || 0;
          return sum + amount;
        }, 0);

      // Contar reservas por status
      const paidCount = bookingsWithDetails.filter(booking => booking.status === 'paid').length;
      const cancelledCount = bookingsWithDetails.filter(booking => booking.status === 'cancelled').length;

      console.log('💸 DailyReports - Cálculo de totales:', {
        totalBookings: bookingsWithDetails.length,
        paidBookings: paidCount,
        cancelledBookings: cancelledCount,
        efectivoBookings: bookingsWithDetails.filter(b => b.payment_method === 'efectivo' || b.payment_method === 'cash').length,
        onlineBookings: bookingsWithDetails.filter(b => b.payment_method === 'online').length,
        paymentMethods: [...new Set(bookingsWithDetails.map(b => b.payment_method))],
        statuses: [...new Set(bookingsWithDetails.map(b => b.status))],
        cashTotal,
        onlineTotal,
        total,
        bookingsWithAmounts: bookingsWithDetails.map(b => ({
          id: b.id,
          status: b.status,
          payment_method: b.payment_method,
          actual_amount_charged: b.actual_amount_charged,
          amount: b.amount,
          finalAmount: b.actual_amount_charged || b.amount || 0
        }))
      });

      setSummary({
        cashTotal: cashTotal,
        onlineTotal: onlineTotal,
        total: total,
        count: bookingsWithDetails.length,
        paidCount: paidCount,
        cancelledCount: cancelledCount
      });

    } catch (error) {
      console.error('Error fetching daily bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyBookings();
  }, [selectedDate, operatorId]);

  const exportToCSV = () => {
    const headers = ['Fecha Cobro', 'Hora Cobro', 'Fecha Reservación', 'Hora Reservación', 'Cliente', 'Membresía', 'Cancha', 'Método Pago', 'Procesado Por', 'Monto'];
    const csvData = bookings.map(booking => {
      const amount = booking.actual_amount_charged || booking.amount || 0;
      return [
        format(new Date(booking.booking_made_at), 'dd/MM/yyyy', { locale: es }),
        format(new Date(booking.booking_made_at), 'HH:mm', { locale: es }),
        format(new Date(booking.start_time), 'dd/MM/yyyy', { locale: es }),
        format(new Date(booking.start_time), 'HH:mm', { locale: es }),
        booking.user?.full_name || 'N/A',
        booking.user?.member_id || 'N/A',
        booking.court?.name || 'N/A',
        (booking.payment_method === 'efectivo' || booking.payment_method === 'cash') ? 'Pago en Ventanilla' : 'En Línea',
        booking.processed_by_user?.full_name || 'Sistema',
        formatCurrency(amount)
      ];
    });

    const csvContent = [headers, ...csvData]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
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
      fecha_cobro: format(new Date(booking.booking_made_at), 'dd/MM/yyyy', { locale: es }),
      hora_cobro: format(new Date(booking.booking_made_at), 'HH:mm', { locale: es }),
      fecha_reservacion: format(new Date(booking.start_time), 'dd/MM/yyyy', { locale: es }),
      hora_reservacion: `${format(new Date(booking.start_time), 'HH:mm', { locale: es })} - ${format(new Date(booking.end_time), 'HH:mm', { locale: es })}`,
      cliente: booking.user?.full_name || 'N/A',
      membresia: booking.user?.member_id || 'N/A',
      cancha: booking.court?.name || 'N/A',
      metodo_pago: (booking.payment_method === 'efectivo' || booking.payment_method === 'cash') ? 'Pago en Ventanilla' : 'En línea',
      procesado_por: booking.processed_by_user?.full_name || 'Sistema',
      monto: booking.actual_amount_charged || booking.amount || 0
    }));

    exportToPDF({
      title: 'Reporte de Cobros del Día',
      subtitle: `Fecha de Cobro: ${format(new Date(selectedDate), 'dd/MM/yyyy', { locale: es })}`,
      data: pdfData,
      columns: [
        { header: 'Fecha Cobro', dataKey: 'fecha_cobro' },
        { header: 'Hora Cobro', dataKey: 'hora_cobro' },
        { header: 'Fecha Reservación', dataKey: 'fecha_reservacion' },
        { header: 'Hora Reservación', dataKey: 'hora_reservacion' },
        { header: 'Cliente', dataKey: 'cliente' },
        { header: 'Membresía', dataKey: 'membresia' },
        { header: 'Cancha', dataKey: 'cancha' },
        { header: 'Método', dataKey: 'metodo_pago' },
        { header: 'Procesado Por', dataKey: 'procesado_por' },
        { header: 'Monto', dataKey: 'monto' }
      ],
      summary: [
        { label: 'Total ventanilla:', value: formatCurrency(summary.cashTotal) },
        { label: 'Total en línea:', value: formatCurrency(summary.onlineTotal) },
        { label: 'Total general:', value: formatCurrency(summary.total) },
        { label: 'Número de reservas:', value: summary.count.toString() }
      ],
      generatedBy: user?.user_metadata?.full_name || 'Operador',
      fileName: `cobros_diarios_${selectedDate}.pdf`
    });
  };

  const getPaymentMethodBadge = (method: string) => {
    return (method === 'efectivo' || method === 'cash') ? (
      <Badge variant="secondary">Pago en Ventanilla</Badge>
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

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ventanilla</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.cashTotal)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">En Línea</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(summary.onlineTotal)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Ingresos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(summary.total)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Vigentes + Canceladas
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Vigentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {summary.paidCount}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Reservas activas
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Canceladas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {summary.cancelledCount}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Sin devolución
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha Cobro</TableHead>
              <TableHead>Fecha Reservación</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Membresía</TableHead>
              <TableHead>Cancha</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Procesado Por</TableHead>
              <TableHead className="text-right">Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : bookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No hay cobros para la fecha seleccionada
                </TableCell>
              </TableRow>
            ) : (
              bookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{format(new Date(booking.booking_made_at), 'dd/MM/yyyy', { locale: es })}</span>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(booking.booking_made_at), 'HH:mm', { locale: es })}
                      </span>
                    </div>
                  </TableCell>
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
                  <TableCell>
                    <Badge variant={booking.status === 'paid' ? 'default' : 'secondary'}>
                      {booking.status === 'paid' ? 'Vigente' : 'Cancelada'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {booking.processed_by_user?.full_name || 'Sistema'}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(booking.actual_amount_charged || booking.amount || 0)}
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