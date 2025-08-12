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
    console.log(`🔄 processPayment started for ${paymentGateway}`, { 
      pendingBooking: !!pendingBooking,
      pendingBookingId: pendingBooking?.id 
    });
    
    if (!pendingBooking) {
      console.error("❌ No pending booking found");
      throw new Error("No hay reserva pendiente");
    }

    try {
      if (paymentGateway === 'stripe') {
        // Procesar pago con Stripe
        const bookingData = {
          selectedDate: new Date(pendingBooking.start_time),
          selectedTime: new Date(pendingBooking.start_time).toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: false 
          }),
          selectedCourt: pendingBooking.court.name,
          selectedCourtType: pendingBooking.court.court_type,
          amount: pendingBooking.amount
        };

        const { data, error } = await supabase.functions.invoke('create-payment', {
          body: { bookingData }
        });

        if (error) throw new Error(`Error al crear sesión de pago: ${error.message}`);
        if (!data?.url) throw new Error("No se recibió URL de pago");

        // Abrir Stripe Checkout en nueva pestaña
        window.open(data.url, '_blank');
        
        toast({
          title: "Redirigiendo a Stripe",
          description: "Se abrió una nueva pestaña para completar el pago.",
        });
        
        return true;
      } else {
        // Para otros métodos de pago, simular por ahora
        console.log(`🔄 INICIANDO PAGO SIMULADO con ${paymentGateway} para reserva ${pendingBooking.id}`);
        console.log('📋 Datos de la reserva pendiente:', pendingBooking);
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('💳 ACTUALIZANDO STATUS DE RESERVA A PAID');
        const { error } = await supabase
          .from("bookings")
          .update({
            status: 'paid',
            payment_gateway: paymentGateway,
            payment_completed_at: new Date().toISOString(),
            payment_id: `${paymentGateway}_${Date.now()}`
          })
          .eq("id", pendingBooking.id);

        console.log('💳 RESULTADO DE ACTUALIZACIÓN:', error ? 'ERROR: ' + error.message : 'ÉXITO');

        if (error) throw error;

        // Disparar webhooks para booking_created
        console.log('🎯 INICIANDO PROCESO DE WEBHOOKS DESPUÉS DEL PAGO');
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user?.id)
            .single();

          const { data: court } = await supabase
            .from("courts")
            .select("*")
            .eq("id", pendingBooking.court_id)
            .single();

          const webhookData = {
            booking_id: pendingBooking.id,
            user_id: user?.id,
            court_id: pendingBooking.court_id,
            start_time: pendingBooking.start_time,
            end_time: pendingBooking.end_time,
            status: 'paid',
            amount: pendingBooking.amount,
            court_name: court?.name,
            court_type: court?.court_type,
            user_name: profile?.full_name,
            user_phone: profile?.phone,
            remotejid: profile?.phone,
            date: new Date(pendingBooking.start_time).toISOString().split('T')[0],
            time: new Date(pendingBooking.start_time).toLocaleTimeString('es-ES', { 
              hour: '2-digit', 
              minute: '2-digit', 
              hour12: false 
            })
          };

          console.log('📋 Datos del webhook preparados:', webhookData);

          // Obtener webhooks activos para booking_created
          const { data: webhooks, error: webhooksError } = await supabase
            .from("webhooks")
            .select("*")
            .eq("event_type", "booking_created")
            .eq("is_active", true);

          console.log('🔍 Webhooks encontrados:', webhooks, 'Error:', webhooksError);

          if (webhooks && webhooks.length > 0) {
            console.log(`🚀 Disparando ${webhooks.length} webhooks`);
            for (const webhook of webhooks) {
              console.log(`📡 Procesando webhook: ${webhook.name} -> ${webhook.url}`);
              try {
                const customHeaders = webhook.headers as Record<string, string> || {};
                const headers: Record<string, string> = {
                  "Content-Type": "application/json",
                  ...customHeaders,
                };

                console.log('📤 Enviando webhook:', {
                  url: webhook.url,
                  headers,
                  payload: {
                    event: "booking_created",
                    timestamp: new Date().toISOString(),
                    data: webhookData,
                    webhook_name: webhook.name
                  }
                });

                const response = await fetch(webhook.url, {
                  method: "POST",
                  headers,
                  body: JSON.stringify({
                    event: "booking_created",
                    timestamp: new Date().toISOString(),
                    data: webhookData,
                    webhook_name: webhook.name
                  }),
                });

                console.log(`✅ Webhook ${webhook.name} response status:`, response.status);
                console.log(`✅ Webhook ${webhook.name} disparado exitosamente`);
              } catch (webhookError) {
                console.error(`❌ Error disparando webhook ${webhook.name}:`, webhookError);
              }
            }
          } else {
            console.log('⚠️ No se encontraron webhooks activos para booking_created');
          }
        } catch (webhookError) {
          console.error("❌ Error procesando webhooks:", webhookError);
          // No fallar la reserva por errores de webhook
        }

        await queryClient.invalidateQueries({ queryKey: ["bookings"] });
        await queryClient.invalidateQueries({ queryKey: ["userActiveBookings", user?.id] });
        await queryClient.invalidateQueries({ queryKey: ["active-bookings", user?.id] });

        toast({
          title: "¡Pago exitoso!",
          description: "Tu reserva ha sido confirmada correctamente.",
        });

        setPendingBooking(null);
        return true;
      }
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