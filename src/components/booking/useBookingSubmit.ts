
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";

export function useBookingSubmit(onBookingSuccess: () => void) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const handleBooking = async (
    selectedDate: Date | undefined,
    selectedTime: string | null,
    selectedCourt: string | null,
    selectedCourtType: 'tennis' | 'padel' | null
  ) => {
    if (!selectedDate || !selectedTime || !selectedCourtType) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para hacer una reserva",
        variant: "destructive",
      });
      return;
    }

    // Si solo hay una cancha del tipo seleccionado, usar esa
    let courtId = selectedCourt;
    if (!courtId && selectedCourtType) {
      const { data: courts } = await supabase
        .from("courts")
        .select("id")
        .eq("court_type", selectedCourtType);
      
      if (courts && courts.length === 1) {
        courtId = courts[0].id;
      }
    }

    if (!courtId) {
      toast({
        title: "Error", 
        description: "Por favor selecciona una cancha",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const [hours, minutes] = selectedTime.split(':').map(Number);
      
      const startTime = new Date(selectedDate);
      startTime.setHours(hours, minutes, 0, 0);
      
      const endTime = new Date(startTime);
      endTime.setHours(startTime.getHours() + 1);

      console.log('🔥 DEBUGGING BOOKING INSERTION - START');
      console.log('User from auth:', user);
      console.log('User ID:', user.id);
      console.log('Court ID:', courtId);
      console.log('Start time:', startTime.toISOString());
      console.log('End time:', endTime.toISOString());

      const bookingData = {
        court_id: courtId,
        user_id: user.id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
      };

      console.log('Booking data to insert:', bookingData);

      const { data: insertedBooking, error } = await supabase
        .from("bookings")
        .insert(bookingData)
        .select('*');

      console.log('Insert response - data:', insertedBooking);
      console.log('Insert response - error:', error);

      if (error) {
        console.error("🚨 Booking error:", error);
        throw error;
      }

      if (insertedBooking && insertedBooking.length > 0) {
        console.log('✅ Successfully inserted booking:', insertedBooking[0]);
        console.log('✅ Inserted booking user_id:', insertedBooking[0].user_id);
      }

      console.log('🔥 DEBUGGING BOOKING INSERTION - END');

      // Disparar webhooks para booking_created
      console.log('🎯 INICIANDO PROCESO DE WEBHOOKS');
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("id", user.id)
          .single();

        const { data: court } = await supabase
          .from("courts")
          .select("name")
          .eq("id", courtId)
          .single();

        const webhookData = {
          id: insertedBooking[0].id,
          courtName: court?.name || "Cancha desconocida",
          courtId: courtId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          userName: profile?.full_name || "Usuario",
          userId: user.id,
          remotejid: profile?.phone || "",
          date: selectedDate.toISOString().split('T')[0],
          time: selectedTime
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

      // Invalidar todas las queries relacionadas con reservas para actualizar los contadores
      await queryClient.invalidateQueries({ 
        queryKey: ["bookings"] 
      });
      
      // Invalidar específicamente la query de reservas activas del usuario
      await queryClient.invalidateQueries({ 
        queryKey: ["userActiveBookings", user?.id] 
      });

      // Invalidar la query de reservas activas para el componente de partidos
      await queryClient.invalidateQueries({ 
        queryKey: ["active-bookings", user?.id] 
      });

      // Invalidar reglas de reserva por si hay cambios
      await queryClient.invalidateQueries({ 
        queryKey: ["bookingRules"] 
      });

      toast({
        title: "¡Reserva exitosa!",
        description: "Tu cancha ha sido reservada correctamente",
      });

      onBookingSuccess();
    } catch (error: any) {
      console.error("Error creating booking:", error);
      let errorMessage = "Hubo un error al crear la reserva";
      
      if (error.message) {
        if (error.message.includes("máximo") || error.message.includes("maximum")) {
          errorMessage = error.message;
        } else if (error.message.includes("anticipación") || error.message.includes("advance")) {
          errorMessage = error.message;
        } else if (error.message.includes("consecutivas") || error.message.includes("consecutive")) {
          errorMessage = error.message;
        } else if (error.message.includes("días") || error.message.includes("days")) {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Error al reservar",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return { handleBooking, isSubmitting };
}
