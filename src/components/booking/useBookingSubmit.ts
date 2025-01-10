import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase-client";
import { useQueryClient } from "@tanstack/react-query";
import { createBookingTimes } from "./TimeValidation";
import { validateBookingTime } from "./BookingValidation";
import { Database } from "@/integrations/supabase/types";

type BookingRules = Database['public']['Tables']['booking_rules']['Row'];

export function useBookingSubmit(onSuccess: () => void) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const checkBookingRules = async (date: Date, selectedTime: string) => {
    try {
      // Primero, obtener las reglas de reserva
      const { data: rules, error: rulesError } = await supabase
        .from("booking_rules")
        .select("*")
        .single();

      if (rulesError) {
        console.error("Error fetching booking rules:", rulesError);
        return false;
      }

      // Verificar el número máximo de reservas activas
      const { data: activeBookings, error: activeBookingsError } = await supabase
        .from("profiles")
        .select("active_bookings")
        .eq("id", user?.id)
        .single();

      if (activeBookingsError) {
        console.error("Error checking active bookings:", activeBookingsError);
        return false;
      }

      if (activeBookings.active_bookings >= (rules as BookingRules).max_active_bookings) {
        toast({
          title: "Límite de reservas alcanzado",
          description: `Ya tienes el máximo de ${(rules as BookingRules).max_active_bookings} reservas activas permitidas.`,
          variant: "destructive",
        });
        return false;
      }

      const timeInterval = (rules as BookingRules).time_between_bookings as string;
      const [hours] = timeInterval.split(':').map(Number);

      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Verificar reservas existentes para ese día
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

      // Verificar el espacio entre reservas
      for (const booking of existingBookings) {
        const existingStart = new Date(booking.start_time);
        const existingEnd = new Date(booking.end_time);
        
        const timeDiffStart = Math.abs(newBookingTime.getTime() - existingEnd.getTime()) / (1000 * 60 * 60);
        const timeDiffEnd = Math.abs(existingStart.getTime() - newBookingTime.getTime()) / (1000 * 60 * 60);
        
        if (timeDiffStart < hours || timeDiffEnd < hours) {
          toast({
            title: "Espacio entre reservas insuficiente",
            description: `Debe haber un espacio de al menos ${timeInterval} entre reservas del mismo día.`,
            variant: "destructive",
          });
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error("Error in checkBookingRules:", error);
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

    // Verificar las reglas de reserva antes de intentar crear una nueva
    const isValidBooking = await checkBookingRules(selectedDate, selectedTime);
    if (!isValidBooking) return;

    setIsSubmitting(true);

    try {
      const times = createBookingTimes(selectedDate, selectedTime);
      if (!times) {
        throw new Error("Error al crear los horarios de la reserva");
      }

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
        // Parse the error message from the backend
        let errorMessage = "No se pudo realizar la reserva. Por favor intenta de nuevo.";
        try {
          const parsedError = JSON.parse(error.message);
          errorMessage = parsedError.message || errorMessage;
        } catch {
          // If we can't parse the error, use the raw message
          errorMessage = error.message || errorMessage;
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