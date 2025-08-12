import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

    // Initialize Stripe
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) throw new Error("Clave secreta de Stripe no configurada");

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status === "paid") {
      // Create Supabase client with service role key to bypass RLS
      const supabaseService = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      // Parse booking data from metadata
      const bookingData = JSON.parse(session.metadata?.booking_data || "{}");
      
      // Find the pending booking and update it
      const { data: existingBooking } = await supabaseService
        .from("bookings")
        .select("*")
        .eq("user_id", session.metadata?.user_id)
        .eq("status", "pending_payment")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (existingBooking) {
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

        if (error) throw error;

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
            date: new Date(existingBooking.start_time).toISOString().split('T')[0],
            time: new Date(existingBooking.start_time).toLocaleTimeString('es-ES', { 
              hour: '2-digit', 
              minute: '2-digit', 
              hour12: false 
            })
          };

          console.log('📋 STRIPE VERIFY-PAYMENT: Datos del webhook preparados:', webhookData);

          // Obtener webhooks activos para booking_created
          const { data: webhooks, error: webhooksError } = await supabaseService
            .from("webhooks")
            .select("*")
            .eq("event_type", "booking_created")
            .eq("is_active", true);

          console.log('🔍 STRIPE VERIFY-PAYMENT: Webhooks encontrados:', webhooks, 'Error:', webhooksError);

          if (webhooks && webhooks.length > 0) {
            console.log(`🚀 STRIPE VERIFY-PAYMENT: Disparando ${webhooks.length} webhooks`);
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

                console.log(`✅ STRIPE VERIFY-PAYMENT: Webhook ${webhook.name} response status:`, response.status);
                console.log(`✅ STRIPE VERIFY-PAYMENT: Webhook ${webhook.name} disparado exitosamente`);
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

    return new Response(JSON.stringify({ 
      success: false, 
      message: "Pago no completado o reserva no encontrada" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });

  } catch (error) {
    console.error("Error verifying payment:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});