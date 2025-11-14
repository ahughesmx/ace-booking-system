import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getStripeConfig } from "../_shared/stripe-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("Session ID no proporcionado");

    const startTime = Date.now();
    console.log(`🔵 [${new Date().toISOString()}] STRIPE VERIFY-PAYMENT: Starting verification`);
    console.log(`📥 [${Date.now() - startTime}ms] Received sessionId: ${sessionId}`);

    // Initialize Stripe with dynamic configuration
    const { stripe, testMode } = await getStripeConfig();
    console.log(`✅ [${Date.now() - startTime}ms] Stripe initialized in ${testMode ? 'TEST' : 'LIVE'} mode for verification`);

    // Retrieve the checkout session
    console.log(`🔍 [${Date.now() - startTime}ms] Retrieving Stripe session...`);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log(`✅ [${Date.now() - startTime}ms] Session retrieved:`, {
      id: session.id,
      paymentStatus: session.payment_status,
      environment: session.metadata?.environment || 'unknown'
    });
    
    // Validate environment consistency
    const sessionEnvironment = session.metadata?.environment || 'unknown';
    const expectedEnvironment = testMode ? 'test' : 'live';
    
    if (sessionEnvironment !== expectedEnvironment) {
      console.warn(`⚠️ [${Date.now() - startTime}ms] Environment mismatch: Session was created in ${sessionEnvironment} mode but current mode is ${expectedEnvironment}`);
    }
    
    if (session.payment_status === "paid") {
      console.log(`💰 [${Date.now() - startTime}ms] Payment status: PAID - Processing booking update...`);
      // Create Supabase client with service role key to bypass RLS
      const supabaseService = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

  // Parse booking data from metadata
  const bookingData = JSON.parse(session.metadata?.booking_data || "{}");
  
  console.log(`🔍 [${Date.now() - startTime}ms] Searching for booking...`);
  // First try to find pending booking
  let { data: existingBooking } = await supabaseService
    .from("bookings")
    .select("*")
    .eq("user_id", session.metadata?.user_id)
    .eq("status", "pending_payment")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  console.log(`📦 [${Date.now() - startTime}ms] Pending booking search result: ${existingBooking ? `FOUND (${existingBooking.id})` : 'NOT FOUND'}`);

  // If no pending booking found, search for recently paid bookings with matching payment_id
  if (!existingBooking && session.payment_intent) {
    console.log(`🔍 [${Date.now() - startTime}ms] No pending booking found, searching for recently paid booking with payment_id: ${session.payment_intent}`);
    
    const { data: paidBooking } = await supabaseService
      .from("bookings")
      .select("*")
      .eq("payment_id", session.payment_intent)
      .eq("status", "paid")
      .gte("payment_completed_at", new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
      .order("payment_completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (paidBooking) {
      console.log(`✅ [${Date.now() - startTime}ms] Found recently paid booking: ${paidBooking.id} - Payment already confirmed`);
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Pago ya confirmado anteriormente",
        booking: paidBooking,
        bookingData: bookingData
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
  }

      if (existingBooking) {
        console.log(`⚠️ [${Date.now() - startTime}ms] About to update booking ${existingBooking.id} to PAID status`);
        // Update booking status to paid
        const { error } = await supabaseService
          .from("bookings")
          .update({
            status: "paid",
            payment_gateway: "stripe",
            payment_completed_at: new Date().toISOString(),
            payment_id: session.payment_intent
          })
          .eq("id", existingBooking.id);

        if (error) {
          console.error(`❌ [${Date.now() - startTime}ms] Error updating booking:`, error);
          throw error;
        }

        console.log(`✅ [${Date.now() - startTime}ms] Booking ${existingBooking.id} updated successfully to PAID`);
        console.log('🎯 STRIPE VERIFY-PAYMENT: Pago confirmado, ejecutando webhooks...');
        
        // Ejecutar webhooks para booking_created después de confirmación de Stripe
        try {
          const { data: profile } = await supabaseService
            .from("profiles")
            .select("*")
            .eq("id", session.metadata?.user_id)
            .single();

          const { data: court } = await supabaseService
            .from("courts")
            .select("*")
            .eq("id", existingBooking.court_id)
            .single();

          const webhookData = {
            booking_id: existingBooking.id,
            user_id: session.metadata?.user_id,
            court_id: existingBooking.court_id,
            start_time: existingBooking.start_time,
            end_time: existingBooking.end_time,
            status: 'paid',
            amount: existingBooking.amount,
            court_name: court?.name,
            court_type: court?.court_type,
            user_name: profile?.full_name,
            user_phone: profile?.phone,
            remotejid: profile?.phone,
            date: new Date(existingBooking.start_time).toLocaleDateString('es-MX', { 
              timeZone: 'America/Mexico_City',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            }).split('/').reverse().join('-'),
            time: `${new Date(existingBooking.start_time).toLocaleTimeString('es-ES', { 
              hour: '2-digit', 
              minute: '2-digit', 
              hour12: false,
              timeZone: 'America/Mexico_City'
            })} - ${new Date(existingBooking.end_time).toLocaleTimeString('es-ES', { 
              hour: '2-digit', 
              minute: '2-digit', 
              hour12: false,
              timeZone: 'America/Mexico_City'
            })}`
          };

          console.log('📋 STRIPE VERIFY-PAYMENT: Datos del webhook preparados:', webhookData);

          // Obtener webhooks activos para booking_created
          const { data: webhooks, error: webhooksError } = await supabaseService
            .from("webhooks")
            .select("*")
            .eq("event_type", "booking_created")
            .eq("is_active", true);

          console.log(`🔍 [${Date.now() - startTime}ms] STRIPE VERIFY-PAYMENT: Webhooks encontrados: ${webhooks?.length || 0}`);

          if (webhooks && webhooks.length > 0) {
            console.log(`🚀 [${Date.now() - startTime}ms] STRIPE VERIFY-PAYMENT: Disparando ${webhooks.length} webhooks`);
            for (const webhook of webhooks) {
              console.log(`📡 STRIPE VERIFY-PAYMENT: Procesando webhook: ${webhook.name} -> ${webhook.url}`);
              try {
                const customHeaders = webhook.headers as Record<string, string> || {};
                const headers: Record<string, string> = {
                  "Content-Type": "application/json",
                  ...customHeaders,
                };

                console.log('📤 STRIPE VERIFY-PAYMENT: Enviando webhook:', {
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

                console.log(`✅ [${Date.now() - startTime}ms] STRIPE VERIFY-PAYMENT: Webhook ${webhook.name} response status: ${response.status}`);
              } catch (webhookError) {
                console.error(`❌ STRIPE VERIFY-PAYMENT: Error disparando webhook ${webhook.name}:`, webhookError);
              }
            }
          } else {
            console.log('⚠️ STRIPE VERIFY-PAYMENT: No se encontraron webhooks activos para booking_created');
          }
        } catch (webhookError) {
          console.error("❌ STRIPE VERIFY-PAYMENT: Error procesando webhooks:", webhookError);
          // No fallar la verificación por errores de webhook
        }

        console.log(`🏁 [${Date.now() - startTime}ms] STRIPE VERIFY-PAYMENT: Completed successfully in ${Date.now() - startTime}ms`);
        return new Response(JSON.stringify({ 
          success: true, 
          message: "Pago verificado y reserva confirmada",
          booking: existingBooking,
          bookingData: bookingData
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // If we reach here, payment was not successful in Stripe
    console.warn(`⚠️ [${Date.now() - startTime}ms] STRIPE VERIFY-PAYMENT: Payment not completed. Status: ${session.payment_status}`);
    return new Response(JSON.stringify({ 
      success: false, 
      message: "El pago no fue completado exitosamente en Stripe",
      payment_status: session.payment_status
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });

  } catch (error) {
    const elapsed = Date.now() - ((error as any).startTime || Date.now());
    console.error(`❌ [${elapsed}ms] STRIPE VERIFY-PAYMENT: Unexpected error:`, {
      message: error.message,
      stack: error.stack
    });
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error.toString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});