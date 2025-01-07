import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/AuthProvider";
import { CanchaSelector } from "@/components/CourtSelector";
import { TimeSlotPicker } from "@/components/TimeSlotPicker";
import { useCourts } from "@/hooks/use-courts";
import { useNavigate } from "react-router-dom";
import { useBookingSubmit } from "./booking/useBookingSubmit";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { format, isAfter, addHours, parseISO } from "date-fns";

// Filtrar los horarios disponibles basados en la hora actual
const getAvailableTimeSlots = () => {
  const now = new Date();
  const currentHour = now.getHours();
  
  // Definir todos los horarios posibles
  const allTimeSlots = [
    "08:00", "09:00", "10:00", "11:00", "12:00",
    "13:00", "14:00", "15:00", "16:00", "17:00",
    "18:00", "19:00", "20:00", "21:00", "22:00"
  ];

  // Si es hoy, filtrar las horas que ya pasaron
  return allTimeSlots.filter(timeSlot => {
    const [hours] = timeSlot.split(":").map(Number);
    return hours > currentHour;
  });
};

interface BookingFormProps {
  selectedDate?: Date;
  onBookingSuccess: () => void;
}

export function BookingForm({ selectedDate, onBookingSuccess }: BookingFormProps) {
  const [selectedCourt, setSelectedCourt] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const { user } = useAuth();
  const { data: courts = [] } = useCourts();
  const navigate = useNavigate();
  const { handleBooking, isSubmitting } = useBookingSubmit(onBookingSuccess);

  // Query existing bookings for the selected date
  const { data: existingBookings = [] } = useQuery({
    queryKey: ["bookings", selectedDate, selectedCourt],
    queryFn: async () => {
      if (!selectedDate || !selectedCourt) return [];
      
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data } = await supabase
        .from("bookings")
        .select("*")
        .eq("court_id", selectedCourt)
        .gte("start_time", startOfDay.toISOString())
        .lte("end_time", endOfDay.toISOString());

      return data || [];
    },
    enabled: !!selectedDate && !!selectedCourt
  });

  const isTimeSlotAvailable = (time: string, courtId: string) => {
    if (!selectedDate) return false;

    // Verificar si el horario ya pasó para el día actual
    const now = new Date();
    const [hours] = time.split(":");
    const slotDate = new Date(selectedDate);
    slotDate.setHours(parseInt(hours), 0, 0, 0);

    if (
      selectedDate.getDate() === now.getDate() &&
      selectedDate.getMonth() === now.getMonth() &&
      selectedDate.getFullYear() === now.getFullYear() &&
      slotDate <= now
    ) {
      return false;
    }

    // Verificar si hay reservas existentes
    return !existingBookings.some(booking => {
      const bookingStart = new Date(booking.start_time);
      const bookingEnd = new Date(booking.end_time);
      return slotDate >= bookingStart && slotDate < bookingEnd;
    });
  };

  const handleLoginRedirect = () => {
    navigate('/login');
  };

  // Obtener los horarios disponibles
  const availableTimeSlots = selectedDate?.getDate() === new Date().getDate() 
    ? getAvailableTimeSlots()
    : [
        "08:00", "09:00", "10:00", "11:00", "12:00",
        "13:00", "14:00", "15:00", "16:00", "17:00",
        "18:00", "19:00", "20:00", "21:00", "22:00"
      ];

  return (
    <div className="space-y-4">
      {courts && courts.length > 0 && (
        <CanchaSelector
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

      {user ? (
        <Button
          className="w-full"
          disabled={!selectedDate || !selectedTime || !selectedCourt || isSubmitting}
          onClick={() => handleBooking(selectedDate, selectedTime, selectedCourt)}
        >
          {isSubmitting ? "Reservando..." : "Reservar cancha"}
        </Button>
      ) : (
        <Button
          className="w-full"
          onClick={handleLoginRedirect}
        >
          Iniciar sesión para reservar
        </Button>
      )}
    </div>
  );
}