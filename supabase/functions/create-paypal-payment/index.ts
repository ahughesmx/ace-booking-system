import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BookingData {
  selectedDate: Date;
  selectedTime: string;
  selectedCourt: string;
  selectedCourtType: string;
  amount: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🟢 CREATE-PAYPAL-PAYMENT: Starting PayPal payment creation');

    // Create Supabase client for authentication
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user?.email) {
      console.error('❌ CREATE-PAYPAL-PAYMENT: User not authenticated');
      return new Response(JSON.stringify({ error: "Usuario no autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get request body
    const { bookingData }: { bookingData: BookingData } = await req.json();
    console.log('📋 CREATE-PAYPAL-PAYMENT: Booking data received:', bookingData);

    if (!bookingData) {
      console.error('❌ CREATE-PAYPAL-PAYMENT: No booking data provided');
      return new Response(JSON.stringify({ error: "Datos de reserva requeridos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create service role client to get PayPal credentials from database
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get PayPal configuration from payment_gateways table
    const { data: paypalConfig, error: configError } = await supabaseService
      .from("payment_gateways")
      .select("*")
      .eq("name", "paypal")
      .eq("enabled", true)
      .single();

    if (configError || !paypalConfig) {
      console.error('❌ CREATE-PAYPAL-PAYMENT: PayPal gateway not configured or disabled:', configError);
      return new Response(JSON.stringify({ error: "PayPal no está configurado o está deshabilitado" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paypalClientId = paypalConfig.test_mode 
      ? paypalConfig.configuration?.clientIdTest 
      : paypalConfig.configuration?.clientIdLive;
    const paypalClientSecret = paypalConfig.test_mode 
      ? paypalConfig.configuration?.clientSecretTest 
      : paypalConfig.configuration?.clientSecretLive;
    const paypalBaseUrl = paypalConfig.test_mode 
      ? "https://api.sandbox.paypal.com" 
      : "https://api.paypal.com";

    if (!paypalClientId || !paypalClientSecret) {
      console.error('❌ CREATE-PAYPAL-PAYMENT: PayPal credentials not configured in database');
      return new Response(JSON.stringify({ error: "Credenciales de PayPal no configuradas" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log('🔑 CREATE-PAYPAL-PAYMENT: Getting PayPal access token...');

    // Get PayPal access token
    const tokenResponse = await fetch(`${paypalBaseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Accept-Language": "en_US",
        "Authorization": `Basic ${btoa(`${paypalClientId}:${paypalClientSecret}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!tokenResponse.ok) {
      console.error('❌ CREATE-PAYPAL-PAYMENT: Failed to get PayPal token:', tokenResponse.status);
      return new Response(JSON.stringify({ error: "Error de autenticación con PayPal" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    console.log('✅ CREATE-PAYPAL-PAYMENT: PayPal access token obtained');

    // Prepare payment data for API v2 (allows card payments without PayPal account)
    const amount = (bookingData.amount / 100).toFixed(2); // Convert from cents to pesos
    const description = `Reserva de ${bookingData.selectedCourtType} - ${bookingData.selectedCourt}`;
    const currentOrigin = req.headers.get("origin") || "https://reservascdv.com";

    const orderData = {
      intent: "CAPTURE",
      purchase_units: [{
        reference_id: `booking_${Date.now()}`,
        description: description,
        amount: {
          currency_code: "MXN",
          value: amount
        }
      }],
      payment_source: {
        paypal: {
          experience_context: {
            payment_method_preference: "UNRESTRICTED",
            brand_name: "Reservas CDV",
            locale: "es-MX",
            landing_page: "GUEST_CHECKOUT",
            shipping_preference: "NO_SHIPPING",
            user_action: "PAY_NOW",
            return_url: `${currentOrigin}/booking-success`,
            cancel_url: `${currentOrigin}/`
          }
        }
      }
    };

    console.log('📤 CREATE-PAYPAL-PAYMENT: Creating PayPal order with data:', orderData);

    // Create PayPal order using v2 API
    const orderResponse = await fetch(`${paypalBaseUrl}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "PayPal-Request-Id": `booking_${Date.now()}`, // Idempotency key
      },
      body: JSON.stringify(orderData),
    });

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      console.error('❌ CREATE-PAYPAL-PAYMENT: PayPal order creation failed:', orderResponse.status, errorText);
      return new Response(JSON.stringify({ error: "Error al crear la orden en PayPal" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orderResult = await orderResponse.json();
    console.log('✅ CREATE-PAYPAL-PAYMENT: PayPal order created:', orderResult.id);

    // Find the approval URL
    const approvalUrl = orderResult.links?.find((link: any) => link.rel === "payer-action")?.href;

    if (!approvalUrl) {
      console.error('❌ CREATE-PAYPAL-PAYMENT: No approval URL found in PayPal response');
      return new Response(JSON.stringify({ error: "No se pudo obtener URL de aprobación de PayPal" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log('🚀 CREATE-PAYPAL-PAYMENT: Payment created successfully, approval URL:', approvalUrl);

    return new Response(JSON.stringify({ 
      approvalUrl,
      paymentId: orderResult.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error('❌ CREATE-PAYPAL-PAYMENT: Error general:', error);
    return new Response(JSON.stringify({ 
      error: "Error interno del servidor" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});