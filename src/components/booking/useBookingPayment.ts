import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";

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
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);

  console.log('🔄 useBookingPayment state:', {
    pendingBooking: !!pendingBooking,
    pendingBookingId: pendingBooking?.id
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
        user_id: forUserId || user.id,
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
      return booking;
    } catch (error) {
      console.error("❌ Error creating pending booking:", error);
      throw error;
    } finally {
      setIsCreatingBooking(false);
    }
  };

  const processPayment = async (paymentGateway: string): Promise<any> => {
    console.log(`🔄 processPayment started for ${paymentGateway}`, { 
      pendingBooking: !!pendingBooking,
      pendingBookingId: pendingBooking?.id,
      user: user?.id,
      session: !!session,
      timestamp: new Date().toISOString()
    });
    
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
        console.log('💳 STRIPE: Starting Stripe redirect payment process');
        
        // Get current session and validate authentication
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        console.log('🔑 Session validation:', {
          hasSession: !!currentSession,
          hasAccessToken: !!currentSession?.access_token,
          tokenLength: currentSession?.access_token?.length || 0,
          sessionError: sessionError?.message
        });

        if (sessionError || !currentSession?.access_token) {
          console.error('❌ Session validation failed:', sessionError);
          throw new Error('Error de autenticación. Por favor, inicie sesión nuevamente.');
        }
        
        // Validate booking data structure
        if (!pendingBooking.court || !pendingBooking.court.name || !pendingBooking.court.court_type) {
          console.error('❌ Invalid booking court data:', pendingBooking.court);
          throw new Error('Datos de cancha incompletos');
        }

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

        // Validate all required fields are present
        const requiredFields = ['selectedDate', 'selectedTime', 'selectedCourt', 'selectedCourtType', 'amount'];
        const missingFields = requiredFields.filter(field => !bookingData[field]);
        if (missingFields.length > 0) {
          console.error('❌ Missing booking data fields:', missingFields, bookingData);
          throw new Error(`Datos de reserva incompletos: ${missingFields.join(', ')}`);
        }

        console.log('📤 Calling create-payment with validated data:', bookingData);
        
        // Use direct fetch call instead of supabase.functions.invoke to ensure body is sent correctly
        const functionUrl = `https://bpjinatcgdmxqetfxjji.supabase.co/functions/v1/create-payment`;
        
        console.log('🌐 Making direct HTTP call to:', functionUrl);
        console.log('📤 Request body:', JSON.stringify({ bookingData }));
        console.log('🔑 Authorization header length:', currentSession.access_token.length);
        
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentSession.access_token}`,
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwamluYXRjZ2RteHFldGZ4amppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU5NDU1NTgsImV4cCI6MjA1MTUyMTU1OH0.79yLPqxNagQqouMrbfCyfLeaEeg3TesEqQsrR9H_ZvQ'
          },
          body: JSON.stringify({ bookingData })
        });
        
        console.log('📥 Raw response status:', response.status);
        console.log('📥 Raw response headers:', Object.fromEntries(response.headers.entries()));
        
        const responseText = await response.text();
        console.log('📥 Raw response text:', responseText);
        
        let data, error;
        
        if (!response.ok) {
          console.error('❌ HTTP error:', response.status, response.statusText);
          try {
            const errorData = JSON.parse(responseText);
            error = new Error(errorData.error || `HTTP ${response.status}`);
            console.error('❌ Parsed error:', errorData);
          } catch {
            error = new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
        } else {
          try {
            data = JSON.parse(responseText);
            console.log('✅ Parsed success response:', data);
          } catch (parseError) {
            console.error('❌ Failed to parse success response:', parseError);
            error = new Error('Invalid response format from payment service');
          }
        }

        console.log('📥 create-payment response:', { data, error });
        
        if (error) {
          console.error('❌ Stripe payment failed:', error);
          console.error('❌ Full error details:', {
            message: error.message,
            details: error.details,
            context: error.context,
            stack: error.stack
          });
          
          // More specific error messages based on error type
          if (error.message?.includes('Authentication')) {
            throw new Error('Error de autenticación. Por favor, inicie sesión nuevamente.');
          } else if (error.message?.includes('Stripe')) {
            throw new Error('Error del servicio de pago. Inténtelo más tarde.');
          } else {
            throw new Error(`Error de pago: ${error.message || 'Error desconocido'}`);
          }
        }
        
        if (!data?.url) {
          console.error('❌ No checkout URL received. Full response:', data);
          throw new Error('No se recibió URL de checkout de Stripe');
        }

        console.log('🚀 Redirecting to Stripe checkout:', data.url);
        // Redirigir a Stripe checkout en la misma pestaña
        window.location.href = data.url;
        
        // No retornamos nada porque estamos redirigiendo
        return;
      } else if (paymentGateway === 'paypal') {
        console.log('💳 PAYPAL: Starting PayPal redirect payment process');
        
        // Get current session and validate authentication
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        console.log('🔑 Session validation:', {
          hasSession: !!currentSession,
          hasAccessToken: !!currentSession?.access_token,
          tokenLength: currentSession?.access_token?.length || 0,
          sessionError: sessionError?.message
        });

        if (sessionError || !currentSession?.access_token) {
          console.error('❌ Session validation failed:', sessionError);
          throw new Error('Error de autenticación. Por favor, inicie sesión nuevamente.');
        }
        
        // Validate booking data structure
        if (!pendingBooking.court || !pendingBooking.court.name || !pendingBooking.court.court_type) {
          console.error('❌ Invalid booking court data:', pendingBooking.court);
          throw new Error('Datos de cancha incompletos');
        }

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

        console.log('📤 Calling create-paypal-payment with validated data:', bookingData);
        
        // Call PayPal payment creation function
        const { data, error } = await supabase.functions.invoke('create-paypal-payment', {
          body: { bookingData }
        });

        console.log('📥 create-paypal-payment response:', { data, error });
        
        if (error) {
          console.error('❌ PayPal payment failed:', error);
          throw new Error(`Error de pago PayPal: ${error.message || 'Error desconocido'}`);
        }
        
        if (!data?.approvalUrl) {
          console.error('❌ No PayPal approval URL received. Full response:', data);
          throw new Error('No se recibió URL de aprobación de PayPal');
        }

        console.log('🚀 Redirecting to PayPal approval:', data.approvalUrl);
        // Redirect to PayPal approval URL
        window.location.href = data.approvalUrl;
        
        // No retornamos nada porque estamos redirigiendo
        return;
      } else {
        // Para otros métodos de pago (incluyendo efectivo)
        console.log(`🔄 INICIANDO PAGO ${paymentGateway.toUpperCase()} para reserva ${pendingBooking.id}`);
        
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simular procesamiento
        
        console.log('💳 ACTUALIZANDO STATUS DE RESERVA A PAID');
        
        const updateResult = await supabase
          .from("bookings")
          .update({
            status: 'paid',
            payment_gateway: paymentGateway,
            payment_method: paymentGateway === 'efectivo' ? 'cash' : paymentGateway,
            payment_completed_at: new Date().toISOString(),
            payment_id: `${paymentGateway}_${Date.now()}`,
            actual_amount_charged: pendingBooking.amount,
            expires_at: null,
            processed_by: paymentGateway === 'efectivo' ? user.id : null
          })
          .eq("id", pendingBooking.id);

        console.log('💳 RESULTADO DE ACTUALIZACIÓN:', updateResult.error ? 'ERROR: ' + updateResult.error.message : 'ÉXITO');

        if (updateResult.error) {
          console.error('💳 ERROR DETALLADO EN UPDATE:', updateResult.error);
          throw updateResult.error;
        }

        // Trigger webhooks for booking_created
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

          // Obtener webhooks activos para booking_created
          const { data: webhooks } = await supabase
            .from("webhooks")
            .select("*")
            .eq("event_type", "booking_created")
            .eq("is_active", true);

          if (webhooks && webhooks.length > 0) {
            console.log(`🚀 Disparando ${webhooks.length} webhooks`);
            for (const webhook of webhooks) {
              try {
                const customHeaders = webhook.headers as Record<string, string> || {};
                const headers: Record<string, string> = {
                  "Content-Type": "application/json",
                  ...customHeaders,
                };

                await fetch(webhook.url, {
                  method: "POST",
                  headers,
                  body: JSON.stringify({
                    event: "booking_created",
                    timestamp: new Date().toISOString(),
                    data: webhookData,
                    webhook_name: webhook.name
                  }),
                });

                console.log(`✅ Webhook ${webhook.name} disparado exitosamente`);
              } catch (webhookError) {
                console.error(`❌ Error disparando webhook ${webhook.name}:`, webhookError);
              }
            }
          }
        } catch (webhookError) {
          console.error("❌ Error procesando webhooks:", webhookError);
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
      console.error("❌ Error processing payment:", error);
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
      
      await queryClient.invalidateQueries({ queryKey: ["bookings"] });
      await queryClient.invalidateQueries({ queryKey: ["userActiveBookings", user?.id] });
    } catch (error) {
      console.error("Error canceling booking:", error);
    }
  };

  const confirmPayPalPayment = async (paymentId: string, payerId: string) => {
    if (isConfirmingPayment) {
      console.log('⚠️ confirmPayPalPayment already running, skipping duplicate call');
      return false;
    }
    
    setIsConfirmingPayment(true);
    
    try {
      if (!user) return false;
      console.log('🎯 Confirmando pago PayPal para usuario:', user.id, 'paymentId:', paymentId, 'payerId:', payerId);

      // Call PayPal verification function
      const { data: verifyResult, error: verifyError } = await supabase.functions.invoke('verify-paypal-payment', {
        body: { paymentId, payerId }
      });

      if (verifyError) {
        console.error('❌ Error en verify-paypal-payment:', verifyError);
        throw new Error('Error al verificar el pago con PayPal');
      }

      if (verifyResult?.success) {
        console.log('✅ Pago PayPal confirmado exitosamente');
        
        // Invalidate queries and clear state
        await queryClient.invalidateQueries({ queryKey: ["bookings"] });
        await queryClient.invalidateQueries({ queryKey: ["userActiveBookings", user?.id] });
        setPendingBooking(null);
        
        return true;
      } else {
        throw new Error(verifyResult?.message || 'No se pudo verificar el pago de PayPal');
      }
    } catch (error) {
      console.error("❌ Error confirmando pago PayPal:", error);
      throw error;
    } finally {
      setIsConfirmingPayment(false);
    }
  };

  const confirmPaymentSuccess = async (sessionId?: string) => {
    // Prevent multiple simultaneous calls
    if (isConfirmingPayment) {
      console.log('⚠️ confirmPaymentSuccess already running, skipping duplicate call');
      return false;
    }
    
    setIsConfirmingPayment(true);
    
    try {
      if (!user) return false;
      console.log('🎯 Confirmando pago para usuario:', user.id, 'sessionId:', sessionId);

      // Always use verify-payment for Stripe payments with sessionId
      if (sessionId) {
        const { data: verifyResult, error: verifyError } = await supabase.functions.invoke('verify-payment', {
          body: { sessionId }
        });

        if (verifyError) {
          console.error('❌ Error en verify-payment:', verifyError);
          throw new Error('Error al verificar el pago con Stripe');
        }

        if (verifyResult?.success) {
          console.log('✅ Pago confirmado exitosamente');
          
          // Invalidate queries and clear state
          await queryClient.invalidateQueries({ queryKey: ["bookings"] });
          await queryClient.invalidateQueries({ queryKey: ["userActiveBookings", user?.id] });
          setPendingBooking(null);
          
          return true;
        } else {
          throw new Error(verifyResult?.message || 'No se pudo verificar el pago');
        }
      } else {
        throw new Error('ID de sesión requerido para confirmar pago');
      }
    } catch (error) {
      console.error("❌ Error confirmando pago:", error);
      throw error;
    } finally {
      setIsConfirmingPayment(false);
    }
  };

  return {
    createPendingBooking,
    processPayment,
    cancelPendingBooking,
    confirmPaymentSuccess,
    confirmPayPalPayment,
    pendingBooking,
    isCreatingBooking,
    // Removed clientSecret and paymentMethod states for simplicity
  };
}