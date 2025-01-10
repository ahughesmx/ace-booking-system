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

  const checkExistingBookings = async (date: Date, selectedTime: string) => {
    try {
      // Primero, obtener las reglas de reserva
      const { data: rules, error: rulesError } = await supabase
        .from("booking_rules")
        .select("time_between_bookings")
        .single();

      if (rulesError) {
        console.error("Error fetching booking rules:", rulesError);
        return false;
      }

      // Convertir el intervalo de tiempo a horas
      const timeInterval = rules.time_between_bookings;
      const [hours] = timeInterval.split(':').map(Number);

      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const { data: existingBookings, error } = await supabase
        .from("bookings")
        .select("start_time, end_time")
        .eq("user_id", user?.id)
        .gte("start_time", startOfDay.toISOString())
        .lte("end_time", endOfDay.toISOString());

      if (error) {
        console.error("Error checking existing bookings:", error);
        return false;
      }

      if (!existingBookings?.length) return true;

      const newBookingTime = new Date(date);
      const [bookingHours] = selectedTime.split(':');
      newBookingTime.setHours(parseInt(bookingHours), 0, 0, 0);

      // Verificar que haya el espacio configurado entre la nueva reserva y las existentes
      for (const booking of existingBookings) {
        const existingStart = new Date(booking.start_time);
        const existingEnd = new Date(booking.end_time);
        
        const timeDiffStart = Math.abs(newBookingTime.getTime() - existingEnd.getTime()) / (1000 * 60 * 60);
        const timeDiffEnd = Math.abs(existingStart.getTime() - newBookingTime.getTime()) / (1000 * 60 * 60);
        
        if (timeDiffStart < hours || timeDiffEnd < hours) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error("Error in checkExistingBookings:", error);
      return false;
    }
  };

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

    // Verificar el espacio entre reservas antes de intentar crear una nueva
    const isValidSpacing = await checkExistingBookings(selectedDate, selectedTime);
    if (!isValidSpacing) {
      const { data: rules } = await supabase
        .from("booking_rules")
        .select("time_between_bookings")
        .single();

      toast({
        title: "Error",
        description: `Debe haber un espacio de al menos ${rules?.time_between_bookings || '1:00:00'} entre tus reservas del mismo día. Por favor selecciona un horario diferente.`,
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

      console.log("Booking times:", times);

      const { error } = await supabase
        .from("bookings")
        .insert({
          court_id: selectedCourt,
          user_id: user.id,
          start_time: times.startTime.toISOString(),
          end_time: times.endTime.toISOString(),
        });

      if (error) {
        let errorMessage = "No se pudo realizar la reserva. Por favor intenta de nuevo.";
        
        if (error.message) {
          if (error.message.includes("máximo de reservas permitidas")) {
            errorMessage = "Ya tienes el máximo de reservas activas permitidas. Debes esperar a que finalicen o cancelar alguna reserva existente.";
          } else if (error.message.includes("2 horas de anticipación")) {
            errorMessage = "Las reservas deben hacerse con al menos 2 horas de anticipación.";
          } else if (error.message.includes("Solo se pueden hacer reservas para hoy y mañana")) {
            errorMessage = "Solo se pueden hacer reservas para hoy y mañana.";
          }
        }

        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      await queryClient.invalidateQueries({ 
        queryKey: ["bookings", selectedDate, selectedCourt] 
      });
      
      onSuccess();
      
      toast({
        title: "Reserva exitosa",
        description: "Tu reserva se ha realizado correctamente.",
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