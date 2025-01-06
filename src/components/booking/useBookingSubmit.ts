import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase-client";
import { useQueryClient } from "@tanstack/react-query";
import { createBookingTimes } from "./TimeValidation";
import { validateBookingTime } from "./BookingValidation";

export function useBookingSubmit(onSuccess: () => void) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleBooking = async (
    selectedDate: Date | undefined,
    selectedTime: string | null,
    selectedCourt: string | null,
  ) => {
    if (!selectedDate || !selectedTime || !selectedCourt || !user) {
      toast({
        title: "Error",
        description: "Por favor selecciona una fecha, cancha y horario.",
        variant: "destructive",
      });
      return;
    }

    const validationError = validateBookingTime(selectedDate, selectedTime);
    if (validationError) {
      toast({
        title: "Error",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const times = createBookingTimes(selectedDate, selectedTime);
      if (!times) {
        throw new Error("Error al crear los horarios de la reserva");
      }

      console.log('Attempting to create booking with:', {
        court_id: selectedCourt,
        user_id: user.id,
        start_time: times.startTime.toISOString(),
        end_time: times.endTime.toISOString(),
      });

      const { error } = await supabase
        .from("bookings")
        .insert({
          court_id: selectedCourt,
          user_id: user.id,
          start_time: times.startTime.toISOString(),
          end_time: times.endTime.toISOString(),
        });

      if (error) {
        console.error("Error creating booking:", error);
        throw error;
      }

      await queryClient.invalidateQueries({ 
        queryKey: ["bookings", selectedDate, selectedCourt] 
      });
      
      onSuccess();
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

  return {
    handleBooking,
    isSubmitting
  };
}