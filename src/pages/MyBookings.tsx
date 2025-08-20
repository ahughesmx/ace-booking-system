import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ArrowLeft, CalendarDays, History, Receipt } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MainNav from "@/components/MainNav";
import { useUserBookings } from "@/hooks/use-user-bookings";
import { BookingCard } from "@/components/BookingCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { format, differenceInHours } from "date-fns";
import { es } from "date-fns/locale";
import { TicketReceipt } from "@/components/booking/TicketReceipt";
import type { Booking } from "@/types/booking";

const ITEMS_PER_PAGE = 5;

export default function MyBookings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [pastPage, setPastPage] = useState(1);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [selectedTicketData, setSelectedTicketData] = useState<any>(null);

  const {
    upcomingBookings,
    pastBookings,
    isLoadingUpcoming,
    isLoadingPast,
    cancelBooking
  } = useUserBookings(user?.id);

  // Pagination for upcoming bookings
  const upcomingStartIndex = (upcomingPage - 1) * ITEMS_PER_PAGE;
  const upcomingEndIndex = upcomingStartIndex + ITEMS_PER_PAGE;
  const paginatedUpcomingBookings = upcomingBookings?.slice(upcomingStartIndex, upcomingEndIndex) || [];
  const upcomingTotalPages = Math.ceil((upcomingBookings?.length || 0) / ITEMS_PER_PAGE);

  // Pagination for past bookings
  const pastStartIndex = (pastPage - 1) * ITEMS_PER_PAGE;
  const pastEndIndex = pastStartIndex + ITEMS_PER_PAGE;
  const paginatedPastBookings = pastBookings?.slice(pastStartIndex, pastEndIndex) || [];
  const pastTotalPages = Math.ceil((pastBookings?.length || 0) / ITEMS_PER_PAGE);

  const handleReprintTicket = (booking: Booking) => {
    const startTime = new Date(booking.start_time);
    const endTime = new Date(booking.end_time);
    const duration = differenceInHours(endTime, startTime);
    
    // Determinar quién atendió basado en el método de pago
    const operatorName = booking.payment_method === 'efectivo' 
      ? booking.user?.full_name || "Usuario no disponible"
      : "Sistema";
    
    const ticketData = {
      courtName: booking.court?.name || "Cancha no disponible",
      courtType: booking.court?.court_type || "N/A",
      date: startTime,
      time: format(startTime, "HH:mm"),
      duration: duration,
      amount: booking.actual_amount_charged || booking.amount || 0,
      paymentMethod: booking.payment_method || "efectivo",
      userName: booking.user?.full_name || "Usuario no disponible",
      operatorName: operatorName,
      receiptNumber: booking.payment_id || booking.id.toString().slice(-8)
    };
    
    setSelectedTicketData(ticketData);
    setShowTicketModal(true);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-muted-foreground">Por favor inicia sesión para ver tus reservaciones.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-primary">Mis Reservaciones</h1>
          <p className="text-muted-foreground mt-2">
            Consulta todas las reservaciones de tu familia
          </p>
        </div>

        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upcoming" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Próximas
            </TabsTrigger>
            <TabsTrigger value="past" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Anteriores
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  Reservaciones Próximas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingUpcoming ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Cargando reservaciones...</p>
                  </div>
                ) : paginatedUpcomingBookings.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No tienes reservaciones próximas.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Hora</TableHead>
                          <TableHead>Cancha</TableHead>
                          <TableHead>Usuario</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedUpcomingBookings.map((booking) => (
                          <TableRow key={booking.id}>
                            <TableCell className="font-medium">
                              {format(new Date(booking.start_time), "dd/MM/yyyy", { locale: es })}
                            </TableCell>
                            <TableCell>
                              {format(new Date(booking.start_time), "HH:mm", { locale: es })} - {format(new Date(booking.end_time), "HH:mm", { locale: es })}
                            </TableCell>
                            <TableCell>
                              {booking.court?.name} ({booking.court?.court_type})
                            </TableCell>
                            <TableCell>
                              {booking.isSpecial ? 
                                (booking.title || "Evento especial") : 
                                (booking.user?.full_name || "Usuario no disponible")
                              }
                            </TableCell>
                            <TableCell>
                              {booking.isSpecial ? (
                                <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                  {booking.event_type || "Evento"}
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-700/10">
                                  Reservación
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleReprintTicket(booking)}
                                  className="flex items-center gap-1"
                                >
                                  <Receipt className="h-3 w-3" />
                                  Ticket
                                </Button>
                                {!booking.isSpecial && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => cancelBooking(booking.id)}
                                    className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
                                  >
                                    Cancelar
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    
                    {upcomingTotalPages > 1 && (
                      <div className="mt-6">
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious
                                onClick={() => setUpcomingPage(Math.max(1, upcomingPage - 1))}
                                className={upcomingPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                              />
                            </PaginationItem>
                            {Array.from({ length: upcomingTotalPages }, (_, i) => i + 1).map((page) => (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  onClick={() => setUpcomingPage(page)}
                                  isActive={page === upcomingPage}
                                  className="cursor-pointer"
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            ))}
                            <PaginationItem>
                              <PaginationNext
                                onClick={() => setUpcomingPage(Math.min(upcomingTotalPages, upcomingPage + 1))}
                                className={upcomingPage === upcomingTotalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="past" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Historial de Reservaciones
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingPast ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Cargando historial...</p>
                  </div>
                ) : paginatedPastBookings.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No tienes reservaciones anteriores.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Table>
                       <TableHeader>
                         <TableRow>
                           <TableHead>Fecha</TableHead>
                           <TableHead>Hora</TableHead>
                           <TableHead>Cancha</TableHead>
                           <TableHead>Usuario</TableHead>
                           <TableHead>Tipo</TableHead>
                           <TableHead>Acciones</TableHead>
                         </TableRow>
                       </TableHeader>
                      <TableBody>
                        {paginatedPastBookings.map((booking) => (
                          <TableRow key={booking.id}>
                            <TableCell className="font-medium">
                              {format(new Date(booking.start_time), "dd/MM/yyyy", { locale: es })}
                            </TableCell>
                            <TableCell>
                              {format(new Date(booking.start_time), "HH:mm", { locale: es })} - {format(new Date(booking.end_time), "HH:mm", { locale: es })}
                            </TableCell>
                            <TableCell>
                              {booking.court?.name} ({booking.court?.court_type})
                            </TableCell>
                            <TableCell>
                              {booking.isSpecial ? 
                                (booking.title || "Evento especial") : 
                                (booking.user?.full_name || "Usuario no disponible")
                              }
                            </TableCell>
                             <TableCell>
                               {booking.isSpecial ? (
                                 <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                   {booking.event_type || "Evento"}
                                 </span>
                               ) : (
                                 <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-700/10">
                                   Reservación
                                 </span>
                               )}
                             </TableCell>
                             <TableCell>
                               <Button
                                 variant="outline"
                                 size="sm"
                                 onClick={() => handleReprintTicket(booking)}
                                 className="flex items-center gap-1"
                               >
                                 <Receipt className="h-3 w-3" />
                                 Ticket
                               </Button>
                             </TableCell>
                           </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    
                    {pastTotalPages > 1 && (
                      <div className="mt-6">
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious
                                onClick={() => setPastPage(Math.max(1, pastPage - 1))}
                                className={pastPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                              />
                            </PaginationItem>
                            {Array.from({ length: pastTotalPages }, (_, i) => i + 1).map((page) => (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  onClick={() => setPastPage(page)}
                                  isActive={page === pastPage}
                                  className="cursor-pointer"
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            ))}
                            <PaginationItem>
                              <PaginationNext
                                onClick={() => setPastPage(Math.min(pastTotalPages, pastPage + 1))}
                                className={pastPage === pastTotalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal para mostrar ticket */}
      <Dialog open={showTicketModal} onOpenChange={setShowTicketModal}>
        <DialogContent className="max-w-md">
          {selectedTicketData && (
            <TicketReceipt
              bookingData={selectedTicketData}
              onClose={() => setShowTicketModal(false)}
              onPrint={() => setShowTicketModal(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}