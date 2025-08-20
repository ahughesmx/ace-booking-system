import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { useCourtTypeSettings } from "@/hooks/use-court-type-settings";

interface BookingData {
  selectedDate: Date;
  selectedTime: string;
  selectedCourt: string;
  selectedCourtType: string;
  forUserId?: string; // Para reservas de operadores
}

export function useBookingPayment() {
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);
  const [pendingBooking, setPendingBooking] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'modal' | 'redirect'>('modal');
  const [clientSecret, setClientSecret] = useState<string>("");

  // DEBUG: Log hook state
  console.log('🔄 useBookingPayment state:', {
    paymentMethod,
    pendingBooking: !!pendingBooking,
    clientSecret: clientSecret ? 'SET' : 'NONE'
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, session } = useAuth();

  // Recuperar reserva pendiente automáticamente al cargar
  useEffect(() => {
    if (user?.id && !pendingBooking) {
      const loadPendingBooking = async () => {
        const { data, error } = await supabase
          .from("bookings")
          .select(`
            *,
            court:courts(name, court_type)
          `)
          .eq("user_id", user.id)
          .eq("status", "pending_payment")
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (data && !error) {
          console.log("📋 Recuperando reserva pendiente existente:", data);
          setPendingBooking(data);
        }
      };

      loadPendingBooking();
    }
  }, [user?.id, pendingBooking]);

  const createPendingBooking = async (bookingData: BookingData) => {
    console.log('📋 createPendingBooking called with:', bookingData);
    console.log('👤 Current user:', { userId: user?.id, email: user?.email });
    
    if (!user?.id) {
      console.error('❌ User not authenticated');
      throw new Error("Usuario no autenticado");
    }

    // Limpiar reservas expiradas primero
    console.log('🧹 Limpiando reservas expiradas antes de crear nueva...');
    try {
      const { error: cleanupError } = await supabase
        .from("bookings")
        .delete()
        .eq("user_id", user.id)
        .eq("status", "pending_payment")
        .lt("expires_at", new Date().toISOString());
        
      if (cleanupError) {
        console.warn('⚠️ Error en limpieza de reservas expiradas:', cleanupError);
      } else {
        console.log('✅ Reservas expiradas limpiadas');
      }
    } catch (error) {
      console.warn('⚠️ Error durante limpieza:', error);
    }

    setIsCreatingBooking(true);
    console.log('🔄 Setting isCreatingBooking to true');

    try {
      const { selectedDate, selectedTime, selectedCourt, selectedCourtType, forUserId } = bookingData;
      
      // Obtener configuración de precios
      const { data: courtSettings } = await supabase
        .from("court_type_settings")
        .select("price_per_hour, operador_price_per_hour")
        .eq("court_type", selectedCourtType)
        .single();

      // Usar precio de operador si forUserId está definido (reserva hecha por operador)
      const pricePerHour = forUserId && courtSettings?.operador_price_per_hour 
        ? courtSettings.operador_price_per_hour 
        : courtSettings?.price_per_hour || 0;
      const duration = 1; // 1 hora por defecto
      const amount = pricePerHour * duration;

      const [hours, minutes] = selectedTime.split(':').map(Number);
      const startTime = new Date(selectedDate);
      startTime.setHours(hours, minutes, 0, 0);
      const endTime = new Date(startTime);
      endTime.setHours(startTime.getHours() + 1);

      const bookingPayload = {
        court_id: selectedCourt,
        user_id: forUserId || user.id, // Usar forUserId si es una reserva de operador
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: 'pending_payment',
        amount: amount,
        currency: 'USD'
      };

      console.log('💰 Booking payload to insert:', bookingPayload);

      const { data: booking, error } = await supabase
        .from("bookings")
        .insert(bookingPayload)
        .select(`
          *,
          court:courts(name, court_type)
        `)
        .single();

      console.log('📊 Booking insertion result:', { booking, error });

      if (error) {
        console.error('❌ Error inserting booking:', error);
        throw error;
      }

      console.log('✅ Booking created successfully:', booking);
      setPendingBooking(booking);
      console.log('✅ Pending booking state set');
      return booking;
    } catch (error) {
      console.error("❌ Error creating pending booking:", error);
      throw error;
    } finally {
      console.log('🔄 Setting isCreatingBooking to false');
      setIsCreatingBooking(false);
    }
  };

  const processPayment = async (paymentGateway: string): Promise<any> => {
    console.log(`🔄 processPayment started for ${paymentGateway}`, { 
      pendingBooking: !!pendingBooking,
      pendingBookingId: pendingBooking?.id,
      user: user?.id,
      session: !!session,
      sessionAccessToken: session?.access_token ? 'PRESENT' : 'MISSING',
      timestamp: new Date().toISOString()
    });
    
    // ARREGLO: Validación mejorada de datos requeridos
    if (!pendingBooking) {
      console.error('❌ No pending booking found');
      throw new Error('No hay reserva pendiente para procesar');
    }

    if (!user) {
      console.error('❌ No user found');
      throw new Error('Usuario no autenticado');
    }

    try {
      if (paymentGateway === 'stripe') {
        console.log('💳 STRIPE: Starting Stripe payment process, paymentMethod:', paymentMethod);
        // Always try modal method first, fallback to redirect if fails
        try {
          console.log('💳 STRIPE: Trying modal method first');
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

            console.log('📤 Calling create-payment-intent with:', bookingData);
            console.log('🔑 JWT Token status:', {
              hasSession: !!session,
              hasAccessToken: !!session?.access_token,
              tokenLength: session?.access_token?.length || 0,
              expiresAt: session?.expires_at || 'unknown'
            });
            
            const { data, error } = await supabase.functions.invoke('create-payment-intent', {
              body: { bookingData }
            });

            console.log('📥 create-payment-intent response:', { data, error });
            if (error) throw error;
            if (!data?.clientSecret) throw new Error("No client secret received");

          console.log('✅ Setting clientSecret for modal');
          setClientSecret(data.clientSecret);
          return { useModal: true, clientSecret: data.clientSecret };
        } catch (modalError) {
          console.warn('💳 STRIPE: Modal method failed, falling back to redirect:', modalError);
          // Continue to redirect method below
        }

        // Fallback to redirect method
        console.log('💳 STRIPE: Using redirect method');
        try {
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

          if (error) throw error;
          if (!data?.url) throw new Error("No checkout URL received");

          console.log('🚀 Returning redirect URL for checkout');
          return { redirectUrl: data.url };
        } catch (redirectError) {
          console.error('❌ Redirect payment also failed:', redirectError);
          throw new Error('No se pudo procesar el pago con Stripe. Intente más tarde.');
        }
      } else {
        // Para otros métodos de pago (incluyendo efectivo)
        console.log(`🔄 INICIANDO PAGO ${paymentGateway.toUpperCase()} para reserva ${pendingBooking.id}`);
        console.log('📋 Datos de la reserva pendiente:', pendingBooking);
        
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simular procesamiento
        
        console.log('💳 ACTUALIZANDO STATUS DE RESERVA A PAID');
        console.log('💳 DATOS DE ACTUALIZACIÓN:', {
          bookingId: pendingBooking.id,
          gateway: paymentGateway,
          timestamp: new Date().toISOString(),
          amount: pendingBooking.amount
        });
        
        const updateResult = await supabase
          .from("bookings")
          .update({
            status: 'paid',
            payment_gateway: paymentGateway,
            payment_method: paymentGateway === 'efectivo' ? 'cash' : paymentGateway,
            payment_completed_at: new Date().toISOString(),
            payment_id: `${paymentGateway}_${Date.now()}`,
            actual_amount_charged: pendingBooking.amount,
            expires_at: null, // Limpiar fecha de expiración al marcar como pagado
            processed_by: paymentGateway === 'efectivo' ? user.id : null
          })
          .eq("id", pendingBooking.id);

        console.log('💳 RESULTADO DE ACTUALIZACIÓN:', updateResult.error ? 'ERROR: ' + updateResult.error.message : 'ÉXITO');
        console.log('💳 UPDATE RESPONSE COMPLETA:', updateResult);

        if (updateResult.error) {
          console.error('💳 ERROR DETALLADO EN UPDATE:', updateResult.error);
          throw updateResult.error;
        }

        // Verificar que la reserva se actualizó correctamente
        const { data: verifyBooking, error: verifyError } = await supabase
          .from("bookings")
          .select("*")
          .eq("id", pendingBooking.id)
          .single();
          
        console.log('🔍 VERIFICACIÓN POST-UPDATE:', { verifyBooking, verifyError });
        
        if (verifyError) {
          console.error('❌ Error verificando reserva:', verifyError);
        } else {
          console.log('✅ Reserva verificada - Status:', verifyBooking.status);
        }

        console.log('💳 ✅ RESERVA ACTUALIZADA CORRECTAMENTE, PROCEDEMOA WEBHOOKS...');
        
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
          description: paymentGateway === 'efectivo' ? "Reserva confirmada - Pago en efectivo recibido" : "Tu reserva ha sido confirmada correctamente.",
        });

        setPendingBooking(null);
        return { 
          success: true, 
          amount: pendingBooking.amount,
          paymentMethod: paymentGateway 
        };
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

  const confirmPaymentSuccess = async () => {
    try {
      if (!pendingBooking) return;

      // Update booking status to paid
      const { error } = await supabase
        .from("bookings")
        .update({
          status: 'paid',
          payment_gateway: 'stripe',
          payment_method: 'stripe',
          payment_completed_at: new Date().toISOString(),
          payment_id: `stripe_${Date.now()}`,
          actual_amount_charged: pendingBooking.amount,
          expires_at: null,
        })
        .eq("id", pendingBooking.id);

      if (error) throw error;

      // Trigger webhooks and cleanup
      await queryClient.invalidateQueries({ queryKey: ["bookings"] });
      await queryClient.invalidateQueries({ queryKey: ["userActiveBookings", user?.id] });
      
      toast({
        title: "¡Pago exitoso!",
        description: "Tu reserva ha sido confirmada correctamente.",
      });

      setPendingBooking(null);
      setClientSecret("");
      return true;
    } catch (error) {
      console.error("Error confirming payment:", error);
      toast({
        title: "Error",
        description: "Error al confirmar el pago. Contacta soporte.",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    createPendingBooking,
    processPayment,
    cancelPendingBooking,
    confirmPaymentSuccess,
    pendingBooking,
    isCreatingBooking,
    paymentMethod,
    clientSecret,
    setPaymentMethod
  };
}