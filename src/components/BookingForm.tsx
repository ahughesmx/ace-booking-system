import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { CanchaSelector } from "@/components/CourtSelector";
import { TimeSlotPicker } from "@/components/TimeSlotPicker";
import { useCourts } from "@/hooks/use-courts";
import { useNavigate } from "react-router-dom";
import { useBookingSubmit } from "./booking/useBookingSubmit";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { BookingAlert } from "./booking/BookingAlert";
import { BookingButton } from "./booking/BookingButton";

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
  const [selectedCourt, setSelectedCourt] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const { user } = useAuth();
  const { data: courts = [] } = useCourts();
  const navigate = useNavigate();
  const { handleBooking, isSubmitting } = useBookingSubmit(onBookingSuccess);

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

  const handleLoginRedirect = () => {
    navigate('/login');
  };

  return (
    <div className="space-y-4">
      {userActiveBookings >= 2 && (
        <BookingAlert 
          message="Ya tienes el máximo de 2 reservas activas permitidas. Debes esperar a que finalicen o cancelar alguna reserva existente."
        />
      )}

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

      <BookingButton 
        isSubmitting={isSubmitting}
        isDisabled={!selectedDate || !selectedTime || !selectedCourt || userActiveBookings >= 2}
        onClick={() => handleBooking(selectedDate, selectedTime, selectedCourt)}
        loginRedirect={handleLoginRedirect}
        isAuthenticated={!!user}
      />
    </div>
  );
}