import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar, CalendarClock, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { RescheduleBookingModal } from "@/components/booking/RescheduleBookingModal";
import { SpecialBookingManagement } from "@/components/admin/SpecialBookingManagement";
import { useToast } from "@/hooks/use-toast";
import { getStartOfDateMexicoCityISO, getEndOfDateMexicoCityISO } from "@/utils/timezone";
import type { Booking } from "@/types/booking";

export function SupervisorBookings() {
  const [activeTab, setActiveTab] = useState("reservas");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all bookings for the selected date
  const { data: bookings, isLoading } = useQuery({
    queryKey: ['supervisor-bookings', selectedDate],
    queryFn: async () => {
      // Usar funciones de timezone correctas para México
      const startOfDayUTC = getStartOfDateMexicoCityISO(selectedDate);
      const endOfDayUTC = getEndOfDateMexicoCityISO(selectedDate);

      console.log('🔍 SupervisorBookings - Filtro de fechas:', {
        selectedDate,
        startOfDayUTC,
        endOfDayUTC
      });

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          user:profiles!user_id (
            id,
            full_name,
            member_id
          ),
          court:courts (
            id,
            name,
            court_type
          )
        `)
        .gte('start_time', startOfDayUTC)
        .lte('start_time', endOfDayUTC)
        .in('status', ['paid', 'pending_payment'])
        .order('start_time', { ascending: true });

      if (error) throw error;

      console.log('📊 SupervisorBookings - Reservas encontradas:', data?.length || 0);

      return (data || []).map((booking) => ({
        ...booking,
        user: Array.isArray(booking.user) ? booking.user[0] : booking.user,
        court: Array.isArray(booking.court) ? booking.court[0] : booking.court,
      })) as Booking[];
    },
  });

  const handleReschedule = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsRescheduleModalOpen(true);
  };

  const handleCloseRescheduleModal = () => {
    setIsRescheduleModalOpen(false);
    setSelectedBooking(null);
    // Refetch bookings after rescheduling
    queryClient.invalidateQueries({ queryKey: ['supervisor-bookings'] });
  };

  const getStatusBadge = (status: string) => {
    if (status === 'paid') {
      return <Badge className="bg-green-500">Pagada</Badge>;
    }
    if (status === 'pending_payment') {
      return <Badge variant="secondary">Pendiente de pago</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="reservas">Reservas</TabsTrigger>
          <TabsTrigger value="especiales">Reservas Especiales</TabsTrigger>
        </TabsList>

        <TabsContent value="reservas" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Gestión de Reservas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                  <div className="flex-1 max-w-sm">
                    <Label htmlFor="date-filter">Filtrar por Fecha</Label>
                    <Input
                      id="date-filter"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {bookings?.length || 0} reserva(s) encontrada(s)
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : !bookings || bookings.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    No hay reservas para la fecha seleccionada
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Hora</TableHead>
                        <TableHead>Usuario</TableHead>
                        <TableHead>Cancha</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bookings.map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell className="font-medium">
                            {format(new Date(booking.start_time), "HH:mm", { locale: es })} -{" "}
                            {format(new Date(booking.end_time), "HH:mm", { locale: es })}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {booking.user?.full_name || "Usuario no disponible"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {booking.user?.member_id || "N/A"}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div>{booking.court?.name}</div>
                              <div className="text-xs text-muted-foreground capitalize">
                                {booking.court?.court_type}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {booking.payment_method || "N/A"}
                            </Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(booking.status)}</TableCell>
                          <TableCell>
                            ${booking.actual_amount_charged || booking.amount || 0}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReschedule(booking)}
                              className="flex items-center gap-1"
                            >
                              <CalendarClock className="h-3 w-3" />
                              Reagendar
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
        </TabsContent>

        <TabsContent value="especiales">
          <SpecialBookingManagement />
        </TabsContent>
      </Tabs>

      {selectedBooking && (
        <RescheduleBookingModal
          isOpen={isRescheduleModalOpen}
          onClose={handleCloseRescheduleModal}
          booking={selectedBooking}
        />
      )}
    </div>
  );
}
