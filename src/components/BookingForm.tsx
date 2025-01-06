import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { CanchaSelector } from "@/components/CourtSelector";
import { TimeSlotPicker } from "@/components/TimeSlotPicker";
import { BookingSubmitButton } from "@/components/BookingSubmitButton";
import { useCourts } from "@/hooks/use-courts";
import { supabase } from "@/lib/supabase-client";
import { useQuery } from "@tanstack/react-query";
import { createBookingDateTime, isTimeSlotAvailable } from "@/utils/dateUtils";

const availableTimeSlots = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00", "21:00", "22:00"
];

interface BookingFormProps {
  selectedDate?: Date;
  onBookingSuccess: () => void;
}

export function BookingForm({ selectedDate, onBookingSuccess }: BookingFormProps) {
  const [selectedCourt, setSelectedCourt] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: courts = [] } = useCourts();

  // Fetch existing bookings for the selected date
  const { data: existingBookings = [] } = useQuery({
    queryKey: ["bookings", selectedDate, selectedCourt],
    queryFn: async () => {
      if (!selectedDate || !selectedCourt) return [];
      
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("court_id", selectedCourt)
        .gte("start_time", startOfDay.toISOString())
        .lte("end_time", endOfDay.toISOString());

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedDate && !!selectedCourt,
  });

  const handleBooking = async () => {
    if (!selectedDate || !selectedTime || !selectedCourt || !user) {
      toast({
        title: "Error",
        description: "Por favor selecciona una fecha, cancha y horario.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const startTime = createBookingDateTime(selectedDate, selectedTime);
      const endTime = new Date(startTime);
      endTime.setHours(startTime.getHours() + 1);

      const { error } = await supabase
        .from("bookings")
        .insert({
          court_id: selectedCourt,
          user_id: user.id,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
        });

      if (error) {
        console.error("Error creating booking:", error);
        toast({
          title: "Error",
          description: "No se pudo realizar la reserva. Por favor intenta de nuevo.",
          variant: "destructive",
        });
        return;
      }

      onBookingSuccess();
      setSelectedTime(null);
      toast({
        title: "Reserva exitosa",
        description: "Tu cancha ha sido reservada correctamente.",
      });
    } catch (error: any) {
      console.error("Error creating booking:", error);
      toast({
        title: "Error",
        description: "No se pudo realizar la reserva. Por favor intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const checkTimeSlotAvailability = (time: string, courtId: string) => {
    return isTimeSlotAvailable(time, selectedDate, existingBookings, courtId);
  };

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
          isTimeSlotAvailable={checkTimeSlotAvailability}
          onTimeSelect={setSelectedTime}
        />
      )}

      <BookingSubmitButton
        isSubmitting={isSubmitting}
        isValid={!!selectedDate && !!selectedTime && !!selectedCourt}
        onSubmit={handleBooking}
      />
    </div>
  );
}