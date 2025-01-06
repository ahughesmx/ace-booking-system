import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/AuthProvider";
import { CanchaSelector } from "@/components/CourtSelector";
import { TimeSlotPicker } from "@/components/TimeSlotPicker";
import { useCourts } from "@/hooks/use-courts";
import { useNavigate } from "react-router-dom";
import { useBookingSubmit } from "./booking/useBookingSubmit";

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
  const { user } = useAuth();
  const { data: courts = [] } = useCourts();
  const navigate = useNavigate();
  const { handleBooking, isSubmitting } = useBookingSubmit(onBookingSuccess);

  const handleLoginRedirect = () => {
    navigate('/login');
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