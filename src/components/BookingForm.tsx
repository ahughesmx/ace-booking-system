
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { CanchaSelector } from "@/components/CourtSelector";
import { CourtTypeSelector } from "@/components/CourtTypeSelector";
import { TimeSlotPicker } from "@/components/TimeSlotPicker";
import { useCourts } from "@/hooks/use-courts";
import { useNavigate } from "react-router-dom";
import { useBookingSubmit } from "./booking/useBookingSubmit";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { BookingAlert } from "./booking/BookingAlert";
import { BookingButton } from "./booking/BookingButton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { TimeSlotsGrid } from "@/components/TimeSlotsGrid";
import { useBookings } from "@/hooks/use-bookings";

interface BookingFormProps {
  selectedDate?: Date;
  onBookingSuccess: () => void;
}

const availableTimeSlots = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00", "21:00", "22:00"
];

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

  // Crear set de slots reservados para el tipo de cancha seleccionado
  const bookedSlots = new Set<string>();
  if (selectedDate && selectedCourtType) {
    bookings.forEach(booking => {
      if (booking.court?.court_type === selectedCourtType) {
        const hour = new Date(booking.start_time).getHours();
        bookedSlots.add(`${hour.toString().padStart(2, '0')}:00`);
      }
    });
  }

  const handleLoginRedirect = () => {
    navigate('/login');
  };

  const handleCourtTypeSelect = (type: 'tennis' | 'padel') => {
    setSelectedCourtType(type);
    setSelectedCourt(null); // Reset court selection when type changes
    setSelectedTime(null); // Reset time selection when type changes
  };

  const handleBackToTypeSelection = () => {
    setSelectedCourtType(null);
    setSelectedCourt(null);
    setSelectedTime(null);
  };

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
              <CanchaSelector
                courts={courts}
                selectedCourt={selectedCourt}
                onCourtSelect={setSelectedCourt}
              />
              
              {/* Mostrar horarios disponibles cuando se haya seleccionado el tipo de cancha */}
              {selectedDate && (
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-[#1e3a8a]">
                    Horarios disponibles para {selectedCourtType}
                  </h4>
                  <TimeSlotsGrid
                    bookedSlots={bookedSlots}
                    businessHours={{ start: 8, end: 22 }}
                    selectedDate={selectedDate}
                    courtType={selectedCourtType}
                  />
                </div>
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

      {/* Paso 3: Selección de horario */}
      {selectedCourt && (
        <TimeSlotPicker
          availableTimeSlots={availableTimeSlots}
          selectedTime={selectedTime}
          selectedCourt={selectedCourt}
          isTimeSlotAvailable={(time, courtId) => {
            if (!selectedDate) return false;
            const [hours] = time.split(":");
            const slotDate = new Date(selectedDate);
            slotDate.setHours(parseInt(hours), 0, 0, 0);
            const now = new Date();
            return slotDate > now;
          }}
          onTimeSelect={setSelectedTime}
        />
      )}

      {/* Botón de reserva */}
      {selectedCourtType && (
        <BookingButton 
          isSubmitting={isSubmitting}
          isDisabled={!selectedDate || !selectedTime || !selectedCourt || userActiveBookings >= 4}
          onClick={() => handleBooking(selectedDate, selectedTime, selectedCourt)}
          loginRedirect={handleLoginRedirect}
          isAuthenticated={!!user}
        />
      )}
    </div>
  );
}
