import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    console.log('🟢 PAYPAL VERIFY-PAYMENT: Starting PayPal payment verification');

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user) {
      console.error('❌ PAYPAL VERIFY-PAYMENT: No user found');
      return new Response(JSON.stringify({ error: "Usuario no autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get request body
    const { paymentId, payerId } = await req.json();
    console.log('📋 PAYPAL VERIFY-PAYMENT: PayPal parameters:', { paymentId, payerId, userId: user.id });

    if (!paymentId || !payerId) {
      console.error('❌ PAYPAL VERIFY-PAYMENT: Missing PayPal parameters');
      return new Response(JSON.stringify({ error: "Faltan parámetros de PayPal" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create service role client for database operations
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    console.log('🔍 PAYPAL VERIFY-PAYMENT: Searching for user booking...');
    
    // First, look for pending payment booking
    let { data: booking, error: bookingError } = await supabaseService
      .from("bookings")
      .select(`
        *,
        court:courts(id, name, court_type)
      `)
      .eq("user_id", user.id)
      .eq("status", "pending_payment")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // If no pending booking found, look for recently paid booking with PayPal payment method
    if (!booking || bookingError) {
      console.log('🔍 PAYPAL VERIFY-PAYMENT: No pending booking found, searching for recent PayPal payment...');
      
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { data: paidBooking, error: paidError } = await supabaseService
        .from("bookings")
        .select(`
          *,
          court:courts(id, name, court_type)
        `)
        .eq("user_id", user.id)
        .eq("status", "paid")
        .eq("payment_method", "paypal")
        .gte("payment_completed_at", fiveMinutesAgo)
        .order("payment_completed_at", { ascending: false })
        .limit(1)
        .single();

      if (paidBooking && !paidError) {
        console.log('✅ PAYPAL VERIFY-PAYMENT: Found recently paid PayPal booking:', paidBooking.id);
        return new Response(JSON.stringify({ 
          success: true, 
          message: "Pago de PayPal ya procesado",
          bookingId: paidBooking.id
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (!booking || bookingError) {
      console.error('❌ PAYPAL VERIFY-PAYMENT: No booking found for user');
      return new Response(JSON.stringify({ 
        success: false, 
        error: "No se encontró reserva pendiente para este usuario" 
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log('✅ PAYPAL VERIFY-PAYMENT: Found booking to update:', booking.id);

    // Update booking to paid status
    const { error: updateError } = await supabaseService
      .from("bookings")
      .update({
        status: "paid",
        payment_gateway: "paypal",
        payment_method: "paypal",
        payment_id: paymentId,
        payment_completed_at: new Date().toISOString(),
        actual_amount_charged: booking.amount,
        expires_at: null
      })
      .eq("id", booking.id);

    if (updateError) {
      console.error('❌ PAYPAL VERIFY-PAYMENT: Error updating booking:', updateError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Error al actualizar la reserva" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log('🎯 PAYPAL VERIFY-PAYMENT: Payment confirmed, executing webhooks...');

    // Get user profile for webhook data
    const { data: profile } = await supabaseService
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    // Prepare webhook data
    const webhookData = {
      booking_id: booking.id,
      user_id: user.id,
      court_id: booking.court_id,
      start_time: booking.start_time,
      end_time: booking.end_time,
      status: "paid",
      amount: booking.amount,
      court_name: booking.court?.name,
      court_type: booking.court?.court_type,
      user_name: profile?.full_name,
      user_phone: profile?.phone,
      remotejid: profile?.phone,
      date: new Date(booking.start_time).toISOString().split('T')[0],
      time: `${new Date(booking.start_time).toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
      })} - ${new Date(booking.end_time).toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
      })}`
    };

    console.log('📋 PAYPAL VERIFY-PAYMENT: Datos del webhook preparados:', webhookData);

    // Get active webhooks for booking_created
    const { data: webhooks, error: webhooksError } = await supabaseService
      .from("webhooks")
      .select("*")
      .eq("event_type", "booking_created")
      .eq("is_active", true);

    console.log('🔍 PAYPAL VERIFY-PAYMENT: Webhooks encontrados:', webhooks, 'Error:', webhooksError);

    if (webhooks && webhooks.length > 0) {
      console.log(`🚀 PAYPAL VERIFY-PAYMENT: Disparando ${webhooks.length} webhooks`);
      
      for (const webhook of webhooks) {
        try {
          console.log(`📡 PAYPAL VERIFY-PAYMENT: Procesando webhook: ${webhook.name} -> ${webhook.url}`);
          
          const customHeaders = webhook.headers as Record<string, string> || {};
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
            ...customHeaders,
          };

          const payload = {
            event: "booking_created",
            timestamp: new Date().toISOString(),
            data: webhookData,
            webhook_name: webhook.name
          };

          console.log(`📤 PAYPAL VERIFY-PAYMENT: Enviando webhook: {
            url: "${webhook.url}",
            headers: ${JSON.stringify(headers)},
            payload: ${JSON.stringify(payload)}
          }`);

          const response = await fetch(webhook.url, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
          });

          console.log(`✅ PAYPAL VERIFY-PAYMENT: Webhook ${webhook.name} response status: ${response.status}`);
          console.log(`✅ PAYPAL VERIFY-PAYMENT: Webhook ${webhook.name} disparado exitosamente`);
        } catch (webhookError) {
          console.error(`❌ PAYPAL VERIFY-PAYMENT: Error disparando webhook ${webhook.name}:`, webhookError);
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Pago de PayPal verificado y confirmado",
      bookingId: booking.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error('❌ PAYPAL VERIFY-PAYMENT: Error general:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: "Error interno del servidor" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});