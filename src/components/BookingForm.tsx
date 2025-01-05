import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { CourtSelector } from "@/components/CourtSelector";
import { TimeSlotPicker } from "@/components/TimeSlotPicker";
import { useCourts } from "@/hooks/use-courts";
import { supabase } from "@/lib/supabase-client";

const availableTimeSlots = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00"
];

interface BookingFormProps {
  selectedDate?: Date;
  onBookingSuccess: () => void;
}

export function BookingForm({ selectedDate, onBookingSuccess }: BookingFormProps) {
  const [selectedCourt, setSelectedCourt] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: courts = [] } = useCourts();

  const isTimeSlotAvailable = (time: string, courtId: string) => {
    if (!selectedDate) return false;
    
    // Convertir la hora seleccionada a la zona horaria de México
    const [hours] = time.split(":");
    const bookingTime = new Date(selectedDate);
    bookingTime.setHours(parseInt(hours), 0, 0, 0);
    
    // Obtener la fecha actual en México
    const nowInMexico = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
    
    // Comparar fechas sin considerar la hora
    const todayInMexico = new Date(nowInMexico.getFullYear(), nowInMexico.getMonth(), nowInMexico.getDate());
    const selectedDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    
    // Si es un día futuro, permitir la reserva
    if (selectedDay > todayInMexico) {
      return true;
    }
    
    // Si es hoy, validar las 2 horas de anticipación
    if (selectedDay.getTime() === todayInMexico.getTime()) {
      const bookingTimeInMexico = new Date(bookingTime.toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
      const hoursDifference = (bookingTimeInMexico.getTime() - nowInMexico.getTime()) / (1000 * 60 * 60);
      return hoursDifference >= 2;
    }
    
    // Si es un día pasado, no permitir la reserva
    return false;
  };

  const handleBooking = async () => {
    if (!selectedDate || !selectedTime || !selectedCourt || !user) {
      toast({
        title: "Error",
        description: "Por favor selecciona una fecha, cancha y horario.",
        variant: "destructive",
      });
      return;
    }

    const [hours] = selectedTime.split(":");
    const startTime = new Date(selectedDate);
    startTime.setHours(parseInt(hours), 0, 0, 0);
    
    try {
      const { error } = await supabase
        .from("bookings")
        .insert({
          court_id: selectedCourt,
          user_id: user.id,
          start_time: startTime.toISOString(),
          end_time: new Date(startTime.getTime() + 60 * 60 * 1000).toISOString(),
        });

      if (error) {
        if (error.message.includes('máximo de reservas permitidas')) {
          toast({
            title: "Límite de reservas alcanzado",
            description: "Ya tienes el máximo de 2 reservas activas permitidas.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

      onBookingSuccess();
      setSelectedTime(null);
    } catch (error) {
      console.error("Error creating booking:", error);
      toast({
        title: "Error",
        description: "No se pudo realizar la reserva. Por favor intenta de nuevo.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      {courts && courts.length > 0 && (
        <CourtSelector
          courts={courts}
          selectedCourt={selectedCourt}
          onCourtSelect={setSelectedCourt}
        />
      )}

      {selectedCourt && (
        <TimeSlotPicker
          availableTimeSlots={availableTimeSlots}
          selectedTime={selectedTime}
          selectedCourt={selectedCourt}
          isTimeSlotAvailable={isTimeSlotAvailable}
          onTimeSelect={setSelectedTime}
        />
      )}

      <Button
        className="w-full"
        disabled={!selectedDate || !selectedTime || !selectedCourt}
        onClick={handleBooking}
      >
        Reservar cancha
      </Button>
    </div>
  );
}