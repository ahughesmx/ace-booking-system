
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { BookingForm } from "@/components/BookingForm";
import { BookingsList } from "@/components/BookingsList";
import { useAllBookings } from "@/hooks/use-bookings";
import { startOfToday, addDays } from "date-fns";
import { useBookingRules } from "@/hooks/use-booking-rules";
import { CourtTypeSelectionDialog } from "@/components/booking/CourtTypeSelectionDialog";
import { Skeleton } from "@/components/ui/skeleton";

interface BookingCalendarProps {
  selectedCourtType?: string | null;
}

function BookingCalendar({ selectedCourtType: initialCourtType }: BookingCalendarProps) {
  console.log('🏗️ BookingCalendar component mounting/rendering with initialCourtType:', initialCourtType);
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedCourtType, setSelectedCourtType] = useState<string | null>(initialCourtType || null);
  const [showCourtTypeDialog, setShowCourtTypeDialog] = useState(!initialCourtType);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Solo hacer la consulta si tenemos una fecha seleccionada
  const { data: bookings = [], isLoading } = useAllBookings(selectedDate);

  // Obtener las reglas de reserva - memoizar para evitar consultas innecesarias  
  const { data: bookingRules } = useBookingRules(selectedCourtType as 'tennis' | 'padel');

  const today = startOfToday();
  
  // Memoizar el cálculo de la fecha máxima para evitar recálculos innecesarios
  const getMaxDate = useMemo(() => {
    if (selectedCourtType && bookingRules && !Array.isArray(bookingRules)) {
      return addDays(today, bookingRules.max_days_ahead);
    }
    // Si no hay tipo de cancha seleccionado, usar fecha muy restrictiva (solo hoy)
    return today;
  }, [selectedCourtType, bookingRules, today]);

  // Memoizar la función isDayDisabled para mejor rendimiento
  const isDayDisabled = useMemo(() => (date: Date) => {
    // Siempre deshabilitar fechas pasadas
    if (date < today) return true;
    
    // Si no hay tipo de cancha seleccionado, deshabilitar todo excepto hoy
    if (!selectedCourtType) {
      return date > today;
    }
    
    // Deshabilitar fechas más allá del máximo permitido según booking_rules
    if (date > getMaxDate) return true;

    return false;
  }, [today, selectedCourtType, getMaxDate]);

  const maxDate = getMaxDate;

  const handleCourtTypeChange = (courtType: string | null) => {
    console.log('BookingCalendar - Court type changed to:', courtType);
    setSelectedCourtType(courtType);
    
    // Si se deselecciona el tipo de cancha, resetear la fecha a hoy
    if (!courtType) {
      setSelectedDate(new Date());
    }
  };

  const handleCourtTypeSelect = (courtType: string) => {
    setSelectedCourtType(courtType);
    setShowCourtTypeDialog(false);
    console.log('Court type selected:', courtType);
  };

  const refetchBookings = () => {
    // The useAllBookings hook will automatically refetch when its dependencies change
    // This is mainly for compatibility with the BookingForm's onBookingSuccess callback
  };

  // Actualizar cuando cambia el tipo de cancha inicial
  useEffect(() => {
    setSelectedCourtType(initialCourtType || null);
    setShowCourtTypeDialog(!initialCourtType);
  }, [initialCourtType]);

  // Mostrar skeleton mientras se cargan los datos iniciales
  if (isLoading && !bookings.length) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <CourtTypeSelectionDialog 
        open={showCourtTypeDialog}
        onCourtTypeSelect={handleCourtTypeSelect}
      />
      
      <div className={`grid gap-6 md:grid-cols-2 ${showCourtTypeDialog ? 'opacity-50 pointer-events-none' : ''}`}>
        <Card className="md:sticky md:top-4 h-fit border-[#6898FE]/20 bg-gradient-to-br from-white to-[#6898FE]/5">
          <CardHeader className="bg-gradient-to-r from-[#6898FE]/10 to-transparent">
            <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6898FE] to-[#0FA0CE]">
              Reserva tu Cancha
            </CardTitle>
            {selectedCourtType && bookingRules && !Array.isArray(bookingRules) && (
              <p className="text-sm text-muted-foreground">
                Reservas hasta {bookingRules.max_days_ahead} días adelante • {
                  selectedCourtType === 'tennis' ? 'Tenis' : 
                  selectedCourtType === 'padel' ? 'Pádel' : 
                  selectedCourtType.charAt(0).toUpperCase() + selectedCourtType.slice(1)
                }
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
    </>
  );
}

export { BookingCalendar };
