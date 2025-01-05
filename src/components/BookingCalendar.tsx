import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { BookingCard } from "@/components/BookingCard";
import { TimeSlotPicker } from "@/components/TimeSlotPicker";
import { CourtSelector } from "@/components/CourtSelector";
import { useBookings } from "@/hooks/use-bookings";
import { useCourts } from "@/hooks/use-courts";
import { supabase } from "@/integrations/supabase/client";

const availableTimeSlots = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00"
];

export default function BookingCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedCourt, setSelectedCourt] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: courts } = useCourts();
  const { data: bookings, refetch: refetchBookings } = useBookings(selectedDate);

  const isTimeSlotAvailable = (time: string, courtId: string) => {
    if (!bookings) return true;
    
    const [hours] = time.split(":");
    const slotStart = new Date(selectedDate!);
    slotStart.setHours(parseInt(hours), 0, 0, 0);
    
    const slotEnd = new Date(slotStart);
    slotEnd.setHours(slotStart.getHours() + 1);

    return !bookings.some(booking => 
      booking.court_id === courtId &&
      new Date(booking.start_time) < slotEnd &&
      new Date(booking.end_time) > slotStart
    );
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
    
    const endTime = new Date(startTime);
    endTime.setHours(startTime.getHours() + 1);

    try {
      const { error } = await supabase
        .from("bookings")
        .insert({
          court_id: selectedCourt,
          user_id: user.id,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
        });

      if (error) throw error;

      toast({
        title: "Reserva exitosa",
        description: "Tu cancha ha sido reservada correctamente.",
      });

      refetchBookings();
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

  const handleCancelBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .delete()
        .eq("id", bookingId);

      if (error) throw error;

      toast({
        title: "Reserva cancelada",
        description: "La reserva ha sido cancelada correctamente.",
      });

      refetchBookings();
    } catch (error) {
      console.error("Error canceling booking:", error);
      toast({
        title: "Error",
        description: "No se pudo cancelar la reserva. Por favor intenta de nuevo.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Reserva tu cancha</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
            />
          </div>

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
        </CardContent>
      </Card>

      {bookings && bookings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Reservas del día</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  isOwner={user?.id === booking.user_id}
                  onCancel={handleCancelBooking}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}