import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { CanchaSelector } from "@/components/CourtSelector";
import { CourtTypeSelector } from "@/components/CourtTypeSelector";
import { TimeSlotSelector } from "@/components/TimeSlotSelector";
import { useCourts } from "@/hooks/use-courts";
import { useNavigate } from "react-router-dom";
import { useBookingSubmit } from "./booking/useBookingSubmit";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { BookingAlert } from "./booking/BookingAlert";
import { BookingButton } from "./booking/BookingButton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useBookings } from "@/hooks/use-bookings";

interface BookingFormProps {
  selectedDate?: Date;
  onBookingSuccess: () => void;
}

const BUSINESS_HOURS = {
  start: 8,
  end: 22,
};

export function BookingForm({ selectedDate, onBookingSuccess }: BookingFormProps) {
  const [selectedCourtType, setSelectedCourtType] = useState<'tennis' | 'padel' | null>(null);
  const [selectedCourt, setSelectedCourt] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const { user } = useAuth();
  const { data: courts = [] } = useCourts(selectedCourtType);
  const navigate = useNavigate();
  const { handleBooking, isSubmitting } = useBookingSubmit(onBookingSuccess);
  const { data: bookings = [] } = useBookings(selectedDate);

  const { data: userActiveBookings = 0 } = useQuery({
    queryKey: ["userActiveBookings", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { data } = await supabase
        .from("profiles")
        .select("active_bookings")
        .eq("id", user.id)
        .single();
      return data?.active_bookings || 0;
    },
    enabled: !!user?.id
  });

  // Selección automática de cancha cuando solo hay una disponible
  useEffect(() => {
    if (courts.length === 1 && !selectedCourt) {
      setSelectedCourt(courts[0].id);
      console.log('Auto-selecting single court:', courts[0].id);
    } else if (courts.length !== 1 && selectedCourt) {
      // Si había una cancha seleccionada automáticamente pero ahora hay más opciones, resetear
      const courtExists = courts.some(court => court.id === selectedCourt);
      if (!courtExists) {
        setSelectedCourt(null);
      }
    }
  }, [courts, selectedCourt]);

  // Crear set de slots reservados para el tipo de cancha seleccionado
  const bookedSlots = new Set<string>();
  if (selectedDate && selectedCourtType) {
    bookings.forEach(booking => {
      if (booking.court && booking.court.court_type === selectedCourtType) {
        const hour = new Date(booking.start_time).getHours();
        bookedSlots.add(`${hour.toString().padStart(2, '0')}:00`);
      }
    });
  }

  console.log('BookingForm - selectedCourtType:', selectedCourtType);
  console.log('BookingForm - selectedCourt:', selectedCourt);
  console.log('BookingForm - selectedTime:', selectedTime);
  console.log('BookingForm - selectedDate:', selectedDate);
  console.log('BookingForm - user:', user);
  console.log('BookingForm - userActiveBookings:', userActiveBookings);
  console.log('BookingForm - courts.length:', courts.length);

  const handleLoginRedirect = () => {
    navigate('/login');
  };

  const handleCourtTypeSelect = (type: 'tennis' | 'padel') => {
    setSelectedCourtType(type);
    setSelectedCourt(null);
    setSelectedTime(null);
  };

  const handleBackToTypeSelection = () => {
    setSelectedCourtType(null);
    setSelectedCourt(null);
    setSelectedTime(null);
  };

  // Función para determinar por qué el botón está deshabilitado
  const getDisabledReason = () => {
    if (!user) return null;
    if (userActiveBookings >= 4) return "Ya tienes el máximo de 4 reservas activas";
    if (!selectedDate) return "Selecciona una fecha";
    if (!selectedCourtType) return "Selecciona un tipo de cancha";
    // Solo mostrar el mensaje de seleccionar cancha si hay más de una cancha disponible
    if (courts.length > 1 && !selectedCourt) return "Selecciona una cancha específica";
    if (!selectedTime) return "Selecciona un horario";
    return null;
  };

  const disabledReason = getDisabledReason();
  const isButtonDisabled = !!disabledReason || isSubmitting;

  return (
    <div className="space-y-4">
      {userActiveBookings >= 4 && (
        <BookingAlert 
          message="Ya tienes el máximo de 4 reservas activas permitidas. Debes esperar a que finalicen o cancelar alguna reserva existente."
        />
      )}

      {/* Paso 1: Selección de tipo de cancha */}
      {!selectedCourtType && (
        <CourtTypeSelector
          selectedType={selectedCourtType}
          onTypeSelect={handleCourtTypeSelect}
        />
      )}

      {/* Paso 2: Selección de cancha específica */}
      {selectedCourtType && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToTypeSelection}
              className="text-[#6898FE] hover:text-[#0FA0CE] hover:bg-[#6898FE]/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Cambiar tipo de cancha
            </Button>
            <span className="text-sm text-muted-foreground capitalize">
              Canchas de {selectedCourtType}
            </span>
          </div>

          {courts && courts.length > 0 ? (
            <>
              {/* Solo mostrar selector de canchas si hay más de una cancha */}
              {courts.length > 1 && (
                <CanchaSelector
                  courts={courts}
                  selectedCourt={selectedCourt}
                  onCourtSelect={setSelectedCourt}
                />
              )}
              
              {/* Mostrar información de cancha única seleccionada automáticamente */}
              {courts.length === 1 && (
                <div className="bg-[#6898FE]/5 border border-[#6898FE]/20 rounded-lg p-3 text-center">
                  <p className="text-sm text-[#1e3a8a]">
                    ✓ Cancha seleccionada: <span className="font-semibold">{courts[0].name}</span>
                  </p>
                </div>
              )}
              
              {/* Mostrar selector de horarios cuando se haya seleccionado el tipo de cancha */}
              {selectedDate && (
                <TimeSlotSelector
                  selectedDate={selectedDate}
                  courtType={selectedCourtType}
                  bookedSlots={bookedSlots}
                  selectedTime={selectedTime}
                  onTimeSelect={setSelectedTime}
                  businessHours={BUSINESS_HOURS}
                />
              )}
            </>
          ) : (
            <div className="text-center p-6 bg-[#6898FE]/5 rounded-lg border border-[#6898FE]/20">
              <p className="text-sm text-muted-foreground">
                No hay canchas de {selectedCourtType} disponibles en este momento
              </p>
            </div>
          )}
        </div>
      )}

      {/* Mostrar información sobre por qué el botón está deshabilitado */}
      {selectedCourtType && disabledReason && user && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-800">
            <span className="font-medium">Información:</span> {disabledReason}
          </p>
        </div>
      )}

      {/* Botón de reserva */}
      {selectedCourtType && (
        <BookingButton 
          isSubmitting={isSubmitting}
          isDisabled={isButtonDisabled}
          onClick={() => {
            console.log('Attempting booking with:', {
              selectedDate,
              selectedTime,
              selectedCourt,
              selectedCourtType
            });
            handleBooking(selectedDate, selectedTime, selectedCourt, selectedCourtType);
          }}
          loginRedirect={handleLoginRedirect}
          isAuthenticated={!!user}
        />
      )}
    </div>
  );
}
