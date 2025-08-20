import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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
  cash: number;
  online: number;
  total: number;
  count: number;
}

export function DailyReportsOperator() {
  const [bookings, setBookings] = useState<DailyBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [summary, setSummary] = useState<PaymentSummary>({ cash: 0, online: 0, total: 0, count: 0 });

  const fetchDailyBookings = async () => {
    setLoading(true);
    try {
      const startOfDay = `${selectedDate}T00:00:00-06:00`; // México timezone
      const endOfDay = `${selectedDate}T23:59:59-06:00`;

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
          user:profiles!bookings_user_id_fkey (
            full_name,
            member_id
          ),
          court:courts!bookings_court_id_fkey (
            name,
            court_type
          ),
          processed_by_user:profiles!bookings_processed_by_fkey (
            full_name
          )
        `)
        .eq('status', 'paid')
        .gte('booking_made_at', startOfDay)
        .lte('booking_made_at', endOfDay)
        .order('booking_made_at', { ascending: false });

      if (error) throw error;

      const bookingsData = data as any[];
      const transformedBookings: DailyBooking[] = bookingsData.map(booking => ({
        ...booking,
        user: Array.isArray(booking.user) ? booking.user[0] : booking.user,
        court: Array.isArray(booking.court) ? booking.court[0] : booking.court,
        processed_by_user: Array.isArray(booking.processed_by_user) ? booking.processed_by_user[0] : booking.processed_by_user,
      }));
      setBookings(transformedBookings);
      
      // Calculate summary
      const cashTotal = transformedBookings
        .filter(b => b.payment_method === 'cash')
        .reduce((sum, booking) => sum + (booking.actual_amount_charged || 0), 0);
      
      const onlineTotal = transformedBookings
        .filter(b => b.payment_method === 'online')
        .reduce((sum, booking) => sum + (booking.actual_amount_charged || 0), 0);
      
      const total = cashTotal + onlineTotal;

      setSummary({
        cash: cashTotal,
        online: onlineTotal,
        total: total,
        count: transformedBookings.length
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
    const headers = ['Fecha', 'Hora', 'Cliente', 'Membresía', 'Cancha', 'Tipo', 'Método Pago', 'Procesado Por', 'Monto'];
    const csvData = bookings.map(booking => [
      format(new Date(booking.start_time), 'dd/MM/yyyy', { locale: es }),
      format(new Date(booking.start_time), 'HH:mm', { locale: es }),
      booking.user?.full_name || 'N/A',
      booking.user?.member_id || 'N/A',
      booking.court?.name || 'N/A',
      booking.court?.court_type || 'N/A',
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
        <Button onClick={exportToCSV} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Efectivo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${summary.cash.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">En Línea</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ${summary.online.toFixed(2)}
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