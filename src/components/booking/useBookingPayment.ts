import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { useCourtTypeSettings } from "@/hooks/use-court-type-settings";

interface BookingData {
  selectedDate: Date;
  selectedTime: string;
  selectedCourt: string;
  selectedCourtType: string;
}

export function useBookingPayment() {
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);
  const [pendingBooking, setPendingBooking] = useState<any>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const createPendingBooking = async (bookingData: BookingData) => {
    if (!user?.id) {
      throw new Error("Usuario no autenticado");
    }

    setIsCreatingBooking(true);

    try {
      const { selectedDate, selectedTime, selectedCourt, selectedCourtType } = bookingData;
      
      // Obtener configuración de precios
      const { data: courtSettings } = await supabase
        .from("court_type_settings")
        .select("price_per_hour")
        .eq("court_type", selectedCourtType)
        .single();

      const pricePerHour = courtSettings?.price_per_hour || 0;
      const duration = 1; // 1 hora por defecto
      const amount = pricePerHour * duration;

      const [hours, minutes] = selectedTime.split(':').map(Number);
      const startTime = new Date(selectedDate);
      startTime.setHours(hours, minutes, 0, 0);
      const endTime = new Date(startTime);
      endTime.setHours(startTime.getHours() + 1);

      const bookingPayload = {
        court_id: selectedCourt,
        user_id: user.id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: 'pending_payment',
        amount: amount,
        currency: 'USD'
      };

      const { data: booking, error } = await supabase
        .from("bookings")
        .insert(bookingPayload)
        .select(`
          *,
          court:courts(name, court_type)
        `)
        .single();

      if (error) throw error;

      setPendingBooking(booking);
      return booking;
    } catch (error) {
      console.error("Error creating pending booking:", error);
      throw error;
    } finally {
      setIsCreatingBooking(false);
    }
  };

  const processPayment = async (paymentGateway: string) => {
    if (!pendingBooking) {
      throw new Error("No hay reserva pendiente");
    }

    try {
      // Aquí se integraría con la pasarela de pago
      // Por ahora simulamos el pago exitoso
      console.log(`Procesando pago con ${paymentGateway} para reserva ${pendingBooking.id}`);
      
      // Simular delay de procesamiento
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Actualizar estado de la reserva a 'paid'
      const { error } = await supabase
        .from("bookings")
        .update({
          status: 'paid',
          payment_gateway: paymentGateway,
          payment_completed_at: new Date().toISOString(),
          payment_id: `${paymentGateway}_${Date.now()}`
        })
        .eq("id", pendingBooking.id);

      if (error) throw error;

      // Invalidar queries para actualizar la UI
      await queryClient.invalidateQueries({ queryKey: ["bookings"] });
      await queryClient.invalidateQueries({ queryKey: ["userActiveBookings", user?.id] });
      await queryClient.invalidateQueries({ queryKey: ["active-bookings", user?.id] });

      toast({
        title: "¡Pago exitoso!",
        description: "Tu reserva ha sido confirmada correctamente.",
      });

      setPendingBooking(null);
      return true;
    } catch (error) {
      console.error("Error processing payment:", error);
      toast({
        title: "Error en el pago",
        description: "No se pudo procesar el pago. Inténtalo de nuevo.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const cancelPendingBooking = async () => {
    if (!pendingBooking) return;

    try {
      const { error } = await supabase
        .from("bookings")
        .delete()
        .eq("id", pendingBooking.id)
        .eq("status", "pending_payment");

      if (error) throw error;

      setPendingBooking(null);
      
      // Invalidar queries para actualizar la UI
      await queryClient.invalidateQueries({ queryKey: ["bookings"] });
      await queryClient.invalidateQueries({ queryKey: ["userActiveBookings", user?.id] });
    } catch (error) {
      console.error("Error canceling booking:", error);
    }
  };

  return {
    createPendingBooking,
    processPayment,
    cancelPendingBooking,
    pendingBooking,
    isCreatingBooking
  };
}