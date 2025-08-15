import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CalendarDays, History } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MainNav from "@/components/MainNav";
import { useUserBookings } from "@/hooks/use-user-bookings";
import { BookingCard } from "@/components/BookingCard";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const ITEMS_PER_PAGE = 5;

export default function MyBookings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [pastPage, setPastPage] = useState(1);

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
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al inicio
          </Button>
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
                    {paginatedUpcomingBookings.map((booking) => (
                      <BookingCard
                        key={booking.id}
                        booking={booking}
                        isOwner={true}
                        onCancel={cancelBooking}
                      />
                    ))}
                    
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
                    {paginatedPastBookings.map((booking) => (
                      <BookingCard
                        key={booking.id}
                        booking={booking}
                        isOwner={false} // Past bookings can't be cancelled
                        onCancel={() => {}} // No cancellation for past bookings
                      />
                    ))}
                    
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
    </div>
  );
}