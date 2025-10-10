import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useGlobalRole } from "@/hooks/use-global-role";
import { useTicketSearch } from "@/hooks/use-ticket-search";
import MainNav from "@/components/MainNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TicketReceipt } from "@/components/booking/TicketReceipt";
import { Search, Calendar, Printer, FileText, User, MapPin, CreditCard } from "lucide-react";
import { format, addHours } from "date-fns";
import { es } from "date-fns/locale";
import type { Booking } from "@/types/booking";

export default function TicketReprint() {
  const { user } = useAuth();
  const { data: userRole } = useGlobalRole(user?.id);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [courtType, setCourtType] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showTicket, setShowTicket] = useState(false);

  const searchFilters = {
    searchTerm: searchTerm || undefined,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    courtType: courtType || undefined,
    paymentMethod: paymentMethod || undefined,
  };

  const { data: tickets, isLoading, error } = useTicketSearch(searchFilters);

  const handlePrintTicket = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowTicket(true);
  };

  const formatTicketData = (booking: Booking) => {
    const startTime = new Date(booking.start_time);
    const endTime = new Date(booking.end_time);
    const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

    return {
      courtName: booking.court?.name || 'N/A',
      courtType: booking.court?.court_type || 'N/A',
      date: startTime,
      time: format(startTime, "HH:mm"),
      duration: Math.round(duration),
      amount: booking.actual_amount_charged || booking.amount || 0,
      paymentMethod: booking.payment_method === 'efectivo' ? 'Pago en Ventanilla' : 
                    booking.payment_method === 'online' ? 'Tarjeta' : 
                    booking.payment_method || 'N/A',
      userName: booking.user?.full_name || 'N/A',
      operatorName: userRole?.role === 'operador' ? user?.user_metadata?.full_name || 'Operador' : 'Sistema',
      receiptNumber: booking.payment_id || `${booking.isSpecial ? 'ESP' : 'REG'}-${booking.id.slice(0, 8)}`,
    };
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStartDate("");
    setEndDate("");
    setCourtType("");
    setPaymentMethod("");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MainNav />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-gray-600">Debes iniciar sesión para acceder a esta funcionalidad.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MainNav />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Reimpresión de Tickets
            </h1>
            <p className="text-gray-600">
              {userRole?.role === 'admin' || userRole?.role === 'operador' 
                ? 'Busca y reimprime cualquier ticket de pago'
                : 'Busca y reimprime tus tickets de pago'
              }
            </p>
          </div>

          {/* Filtros de búsqueda */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Filtros de Búsqueda
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search">Buscar por nombre, folio o miembro</Label>
                  <Input
                    id="search"
                    placeholder="Escribe para buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startDate">Fecha desde</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">Fecha hasta</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo de cancha</Label>
                  <Select value={courtType} onValueChange={setCourtType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los tipos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos los tipos</SelectItem>
                      <SelectItem value="padel">Pádel</SelectItem>
                      <SelectItem value="tennis">Tenis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Método de pago</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los métodos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos los métodos</SelectItem>
                      <SelectItem value="efectivo">Pago en Ventanilla</SelectItem>
                      <SelectItem value="online">Tarjeta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button variant="outline" onClick={clearFilters} className="w-full">
                    Limpiar filtros
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resultados */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Tickets Encontrados
                {tickets && (
                  <span className="text-sm font-normal text-gray-500">
                    ({tickets.length} resultado{tickets.length !== 1 ? 's' : ''})
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading && (
                <div className="text-center py-8">
                  <p className="text-gray-600">Buscando tickets...</p>
                </div>
              )}

              {error && (
                <div className="text-center py-8">
                  <p className="text-red-600">Error al buscar tickets. Intenta de nuevo.</p>
                </div>
              )}

              {tickets && tickets.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-600">No se encontraron tickets con los filtros aplicados.</p>
                </div>
              )}

              {tickets && tickets.length > 0 && (
                <div className="space-y-4">
                  {tickets.map((ticket) => {
                    const startTime = new Date(ticket.start_time);
                    const endTime = new Date(ticket.end_time);
                    const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60));

                    return (
                      <div
                        key={ticket.id}
                        className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-blue-500" />
                              <div>
                                <p className="font-medium">{ticket.user?.full_name}</p>
                                <p className="text-sm text-gray-500">#{ticket.user?.member_id}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-green-500" />
                              <div>
                                <p className="font-medium">{ticket.court?.name}</p>
                                <p className="text-sm text-gray-500 capitalize">{ticket.court?.court_type}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-orange-500" />
                              <div>
                                <p className="font-medium">
                                  {format(startTime, "dd/MM/yyyy")}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {format(startTime, "HH:mm")} - {format(endTime, "HH:mm")} ({duration}h)
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4 text-purple-500" />
                              <div>
                                <p className="font-medium">
                                  ${(ticket.actual_amount_charged || ticket.amount || 0).toFixed(2)}
                                </p>
                                <p className="text-sm text-gray-500 capitalize">
                                  {ticket.payment_method === 'efectivo' ? 'Pago en Ventanilla' : 
                                   ticket.payment_method === 'online' ? 'Tarjeta' : 
                                   ticket.payment_method}
                                </p>
                              </div>
                            </div>
                          </div>

                          <Button
                            onClick={() => handlePrintTicket(ticket)}
                            className="ml-4"
                            size="sm"
                          >
                            <Printer className="h-4 w-4 mr-2" />
                            Imprimir
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de ticket */}
      {showTicket && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="max-w-md w-full">
            <TicketReceipt
              bookingData={formatTicketData(selectedBooking)}
              onClose={() => {
                setShowTicket(false);
                setSelectedBooking(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}