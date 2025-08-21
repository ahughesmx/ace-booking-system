import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Calendar, FileText } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { exportToPDF } from "@/utils/pdf-export";
import { formatCurrency } from "@/lib/utils";
import { getStartOfTodayMexicoCityISO, getEndOfTodayMexicoCityISO, toMexicoCityTime, fromMexicoCityTimeToUTC } from "@/utils/timezone";

interface CashBooking {
  id: string;
  start_time: string;
  end_time: string;
  actual_amount_charged: number;
  amount: number;
  currency: string;
  booking_made_at: string;
  user: {
    full_name: string;
    member_id: string;
  } | null;
  court: {
    name: string;
    court_type: string;
  };
}

export function CashReportsOperator() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<CashBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [total, setTotal] = useState(0);

  const fetchCashBookings = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Crear rango de fechas para México (UTC-6)
      const selectedDateStr = selectedDate;
      const startOfDayMexico = new Date(`${selectedDateStr}T06:00:00.000Z`); // Inicio del día en México = 6 AM UTC
      const endOfDayMexico = new Date(`${selectedDateStr}T05:59:59.999Z`); // Fin del día en México = 5:59 AM UTC del día siguiente
      endOfDayMexico.setDate(endOfDayMexico.getDate() + 1);

      const startOfDayUTC = startOfDayMexico.toISOString();
      const endOfDayUTC = endOfDayMexico.toISOString();

      console.log('🔍 CashReports - Filtro de fechas:', {
        selectedDate: selectedDateStr,
        startOfDayUTC,
        endOfDayUTC,
        startOfDayMexico: startOfDayMexico.toString(),
        endOfDayMexico: endOfDayMexico.toString()
      });

      // Usar JOIN para obtener datos de usuario y cancha en una consulta
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          start_time,
          end_time,
          actual_amount_charged,
          amount,
          currency,
          booking_made_at,
          payment_method,
          status,
          profiles:user_id (
            full_name,
            member_id
          ),
          courts (
            name,
            court_type
          )
        `)
        .eq('payment_method', 'efectivo')
        .in('status', ['paid', 'cancelled'])
        .gte('booking_made_at', startOfDayUTC)
        .lte('booking_made_at', endOfDayUTC)
        .order('start_time', { ascending: false });

      if (error) throw error;

      console.log('💰 CashReports - Datos encontrados:', {
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
        court: Array.isArray(booking.courts) ? booking.courts[0] : booking.courts
      }));

      setBookings(bookingsWithDetails);
      
      const totalAmount = bookingsWithDetails.reduce((sum, booking) => {
        const amount = booking.actual_amount_charged || booking.amount || 0;
        return sum + amount;
      }, 0);
      setTotal(totalAmount);

    } catch (error) {
      console.error('Error fetching cash bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCashBookings();
  }, [selectedDate, user]);

  const exportToCSV = () => {
    const headers = ['Fecha Cobro', 'Hora Cobro', 'Fecha Reservación', 'Hora Reservación', 'Cliente', 'Membresía', 'Cancha', 'Monto'];
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
        formatCurrency(amount)
      ];
    });

    const csvContent = [headers, ...csvData]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `cobros_efectivo_${selectedDate}.csv`);
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
      monto: booking.actual_amount_charged || booking.amount || 0
    }));

    exportToPDF({
      title: 'Reporte de Cobros en Efectivo',
      subtitle: `Fecha de Cobro: ${format(new Date(selectedDate), 'dd/MM/yyyy', { locale: es })}`,
      data: pdfData,
      columns: [
        { header: 'Fecha Cobro', dataKey: 'fecha_cobro', width: 18 },
        { header: 'Hora Cobro', dataKey: 'hora_cobro', width: 16 },
        { header: 'Fecha Reservación', dataKey: 'fecha_reservacion', width: 18 },
        { header: 'Hora Reservación', dataKey: 'hora_reservacion', width: 24 },
        { header: 'Cliente', dataKey: 'cliente', width: 35 },
        { header: 'Membresía', dataKey: 'membresia', width: 18 },
        { header: 'Cancha', dataKey: 'cancha', width: 20 },
        { header: 'Monto', dataKey: 'monto', width: 18 }
      ],
      summary: [
        { label: 'Total de cobros:', value: formatCurrency(total) },
        { label: 'Número de reservas:', value: bookings.length.toString() }
      ],
      generatedBy: user?.user_metadata?.full_name || 'Operador',
      fileName: `cobros_efectivo_${selectedDate}.pdf`
    });
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Total de Cobros en Efectivo</span>
            <span className="text-2xl font-bold text-primary">
              {formatCurrency(total)}
            </span>
          </CardTitle>
        </CardHeader>
      </Card>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha Cobro</TableHead>
              <TableHead>Fecha Reservación</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Membresía</TableHead>
              <TableHead>Cancha</TableHead>
              <TableHead className="text-right">Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : bookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No hay cobros en efectivo para la fecha seleccionada
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