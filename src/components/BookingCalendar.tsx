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
import { useAvailableCourtTypes } from "@/hooks/use-available-court-types";
import { CourtTypeSelectionDialog } from "@/components/booking/CourtTypeSelectionDialog";

interface BookingCalendarProps {
  selectedCourtType?: string | null;
}

function BookingCalendar({ selectedCourtType: initialCourtType }: BookingCalendarProps) {
  console.log('🟢 BookingCalendar RENDER START - timestamp:', new Date().getTime());
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedCourtType, setSelectedCourtType] = useState<string | null>(initialCourtType || null);
  const [showCourtTypeDialog, setShowCourtTypeDialog] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Obtener tipos disponibles para auto-selección
  const { data: availableTypes = [] } = useAvailableCourtTypes();
  
  console.log('📊 BookingCalendar HOOKS INITIALIZED - timestamp:', new Date().getTime());
  
  // Solo hacer la consulta si tenemos una fecha seleccionada
  const { data: bookings = [], isLoading } = useAllBookings(selectedDate);

  console.log('📈 BookingCalendar BOOKINGS HOOK EXECUTED - isLoading:', isLoading, 'timestamp:', new Date().getTime());

  // Obtener las reglas de reserva - memoizar para evitar consultas innecesarias  
  const { data: bookingRules } = useBookingRules(selectedCourtType as 'tennis' | 'padel');

  console.log('📋 BookingCalendar BOOKING RULES HOOK EXECUTED - timestamp:', new Date().getTime());

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
    console.log('🗓️ CALENDAR DEBUG:', {
      date: date.toDateString(),
      today: today.toDateString(),
      selectedCourtType,
      bookingRules: bookingRules ? 'exists' : 'null',
      maxDaysAhead: bookingRules && !Array.isArray(bookingRules) ? bookingRules.max_days_ahead : 'N/A',
      getMaxDate: getMaxDate.toDateString()
    });
    
    // Siempre deshabilitar fechas pasadas
    if (date < today) return true;
    
    // Si no hay tipo de cancha seleccionado, deshabilitar todo excepto hoy
    if (!selectedCourtType) {
      console.log('❌ No selectedCourtType - disabling date:', date.toDateString());
      return date > today;
    }
    
    // Deshabilitar fechas más allá del máximo permitido según booking_rules
    if (date > getMaxDate) {
      console.log('❌ Date beyond max allowed - disabling:', date.toDateString(), 'max:', getMaxDate.toDateString());
      return true;
    }

    console.log('✅ Date enabled:', date.toDateString());
    return false;
  }, [today, selectedCourtType, getMaxDate]);

  const handleCourtTypeChange = (courtType: string | null) => {
    console.log('BookingCalendar - Court type changed to:', courtType);
    
    // Evitar cambios innecesarios que causen re-renders
    if (courtType !== selectedCourtType) {
      setSelectedCourtType(courtType);
      
      // Si se deselecciona el tipo de cancha, resetear la fecha a hoy
      if (!courtType) {
        setSelectedDate(new Date());
      }
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

  // Lógica de inicialización y auto-selección controlada con memorización
  useEffect(() => {
    console.log('🔄 BookingCalendar useEffect TRIGGERED - timestamp:', new Date().getTime());
    console.log('🔄 Current state:', { 
      selectedCourtType, 
      initialCourtType, 
      availableTypesLength: availableTypes.length,
      showCourtTypeDialog 
    });
    
    // Si hay un tipo inicial válido y diferente al actual
    if (initialCourtType && initialCourtType !== selectedCourtType) {
      console.log('🎯 SETTING initial court type:', initialCourtType);
      setSelectedCourtType(initialCourtType);
      setShowCourtTypeDialog(false);
      return;
    }
    
    // Si ya hay un tipo seleccionado, cerrar el diálogo
    if (selectedCourtType) {
      if (showCourtTypeDialog) {
        console.log('🎯 CLOSING dialog because court type is selected:', selectedCourtType);
        setShowCourtTypeDialog(false);
      }
      return;
    }
    
    // Solo proceder si no hay tipo seleccionado y hay tipos disponibles
    if (!selectedCourtType && availableTypes.length > 0) {
      if (availableTypes.length === 1 && availableTypes[0]?.type_name) {
        const singleType = availableTypes[0].type_name;
        console.log('🎯 AUTO-SELECTING single court type:', singleType);
        setSelectedCourtType(singleType);
        setShowCourtTypeDialog(false);
      } else if (availableTypes.length > 1 && !showCourtTypeDialog) {
        console.log('🎯 SHOWING dialog for multiple types:', availableTypes.length);
        setShowCourtTypeDialog(true);
      }
    }
  }, [initialCourtType, selectedCourtType, availableTypes.length, showCourtTypeDialog]);

  console.log('🚀 BookingCalendar ABOUT TO RENDER JSX - timestamp:', new Date().getTime());
  console.log('🔍 OVERLAY DEBUG - showCourtTypeDialog:', showCourtTypeDialog, 'availableTypes.length:', availableTypes.length, 'APPLYING OVERLAY:', showCourtTypeDialog && availableTypes.length > 1);

  const result = (
    <>
      <CourtTypeSelectionDialog 
        open={false}
        onCourtTypeSelect={handleCourtTypeSelect}
      />
      
      <div className="grid gap-6 md:grid-cols-2">
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
  
  console.log('✅ BookingCalendar RENDER COMPLETED - timestamp:', new Date().getTime());
  
  return result;
}

export { BookingCalendar };