
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { BookingForm } from "@/components/BookingForm";
import { BookingsList } from "@/components/BookingsList";
import { useBookings } from "@/hooks/use-bookings";
import { startOfToday, addDays } from "date-fns";
import { useBookingRules } from "@/hooks/use-booking-rules";

interface BookingCalendarProps {
  selectedCourtType?: 'tennis' | 'padel' | null;
}

export function BookingCalendar({ selectedCourtType: initialCourtType }: BookingCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedCourtType, setSelectedCourtType] = useState<'tennis' | 'padel' | null>(initialCourtType || null);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: bookings = [], refetch: refetchBookings } = useBookings(selectedDate);

  // Obtener las reglas de reserva
  const { data: bookingRules } = useBookingRules(selectedCourtType);

  const today = startOfToday();
  
  // Calcular la fecha máxima basada en booking_rules
  const getMaxDate = () => {
    if (selectedCourtType && bookingRules && !Array.isArray(bookingRules)) {
      return addDays(today, bookingRules.max_days_ahead);
    }
    // Si no hay tipo de cancha seleccionado, usar fecha muy restrictiva (solo hoy)
    return today;
  };

  // Verificar si un día está deshabilitado
  const isDayDisabled = (date: Date) => {
    // Siempre deshabilitar fechas pasadas
    if (date < today) return true;
    
    // Si no hay tipo de cancha seleccionado, deshabilitar todo excepto hoy
    if (!selectedCourtType) {
      return date > today;
    }
    
    // Deshabilitar fechas más allá del máximo permitido según booking_rules
    if (date > getMaxDate()) return true;

    return false;
  };

  const maxDate = getMaxDate();

  const handleCourtTypeChange = (courtType: 'tennis' | 'padel' | null) => {
    console.log('BookingCalendar - Court type changed to:', courtType);
    setSelectedCourtType(courtType);
    
    // Si se deselecciona el tipo de cancha, resetear la fecha a hoy
    if (!courtType) {
      setSelectedDate(new Date());
    }
  };

  // Actualizar cuando cambia el tipo de cancha inicial
  useEffect(() => {
    if (initialCourtType !== selectedCourtType) {
      setSelectedCourtType(initialCourtType || null);
    }
  }, [initialCourtType]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="md:sticky md:top-4 h-fit border-[#6898FE]/20 bg-gradient-to-br from-white to-[#6898FE]/5">
        <CardHeader className="bg-gradient-to-r from-[#6898FE]/10 to-transparent">
          <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6898FE] to-[#0FA0CE]">
            Reserva tu Cancha
          </CardTitle>
          {selectedCourtType && bookingRules && !Array.isArray(bookingRules) && (
            <p className="text-sm text-muted-foreground">
              Reservas hasta {bookingRules.max_days_ahead} días adelante • {selectedCourtType === 'tennis' ? 'Tenis' : 'Pádel'}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-[#6898FE]/20 p-3">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={isDayDisabled}
              className="mx-auto"
              initialFocus
            />
          </div>
          
          {user ? (
            <BookingForm 
              selectedDate={selectedDate}
              initialCourtType={selectedCourtType}
              onCourtTypeChange={handleCourtTypeChange}
              onBookingSuccess={() => {
                refetchBookings();
                toast({
                  title: "Reserva exitosa",
                  description: "Tu cancha ha sido reservada correctamente.",
                });
              }}
            />
          ) : (
            <div className="text-center p-4 bg-[#6898FE]/5 rounded-lg border border-[#6898FE]/20">
              <p className="text-sm text-muted-foreground mb-2">
                Inicia sesión para reservar una cancha
              </p>
              <Button 
                variant="outline" 
                onClick={() => navigate('/login')}
                className="hover:bg-[#6898FE]/10 border-[#6898FE]/20"
              >
                Iniciar Sesión
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <BookingsList 
        bookings={bookings}
        selectedDate={selectedDate}
        onCancelSuccess={() => {
          refetchBookings();
          toast({
            title: "Reserva cancelada",
            description: "La reserva ha sido cancelada correctamente.",
          });
        }}
      />
    </div>
  );
}
