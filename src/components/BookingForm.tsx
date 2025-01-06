import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { CanchaSelector } from "@/components/CourtSelector";
import { TimeSlotPicker } from "@/components/TimeSlotPicker";
import { useCourts } from "@/hooks/use-courts";
import { supabase } from "@/lib/supabase-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

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
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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

  const isTimeSlotAvailable = (time: string, courtId: string) => {
    if (!selectedDate) return false;
    
    const [hours] = time.split(":");
    const bookingTime = new Date(selectedDate);
    bookingTime.setHours(parseInt(hours), 0, 0, 0);
    const now = new Date();
    const hoursDifference = (bookingTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursDifference < 2) return false;

    const timeSlotStart = new Date(selectedDate);
    timeSlotStart.setHours(parseInt(hours), 0, 0, 0);
    const timeSlotEnd = new Date(timeSlotStart);
    timeSlotEnd.setHours(timeSlotStart.getHours() + 1);

    return !existingBookings.some(booking => {
      const bookingStart = new Date(booking.start_time);
      const bookingEnd = new Date(booking.end_time);
      return (
        (timeSlotStart >= bookingStart && timeSlotStart < bookingEnd) ||
        (timeSlotEnd > bookingStart && timeSlotEnd <= bookingEnd)
      );
    });
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

    setIsSubmitting(true);

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('active_bookings')
        .eq('id', user.id)
        .single();

      if (profile && profile.active_bookings >= 2) {
        toast({
          title: "Límite de reservas alcanzado",
          description: "Ya tienes el máximo de 2 reservas activas permitidas.",
          variant: "destructive",
        });
        return;
      }

      const [hours] = selectedTime.split(":");
      const startTime = new Date(selectedDate);
      startTime.setHours(parseInt(hours), 0, 0, 0);
      startTime.setMinutes(0, 0, 0);

      const endTime = new Date(startTime);
      endTime.setHours(startTime.getHours() + 1);
      endTime.setMinutes(0, 0, 0);

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

      await queryClient.invalidateQueries({ queryKey: ["bookings", selectedDate, selectedCourt] });
      
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
          onClick={handleBooking}
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