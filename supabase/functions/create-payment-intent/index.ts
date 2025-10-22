import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { format } from "https://esm.sh/date-fns@3.6.0";
import { toZonedTime } from "https://esm.sh/date-fns-tz@3.2.0";
import { getStripeConfig } from "../_shared/stripe-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Force function restart - v2.0

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    // Parse request body
    const { bookingData } = await req.json();
    if (!bookingData) {
      throw new Error("Booking data is required");
    }

    console.log("Creating Payment Intent for booking:", bookingData);

    // Initialize Stripe with dynamic configuration
    console.log("🔧 Initializing Stripe with dynamic configuration...");
    const { stripe, testMode } = await getStripeConfig();
    console.log(`✅ Stripe initialized in ${testMode ? 'TEST' : 'LIVE'} mode`);

    // Check if customer exists or create new one
    const customers = await stripe.customers.list({ 
      email: user.email, 
      limit: 1 
    });
    
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.user_metadata?.full_name || user.email,
      });
      customerId = customer.id;
    }

    // Format date and time for Mexico timezone
    const mexicoTimeZone = 'America/Mexico_City';
    const bookingDateTime = new Date(`${bookingData.selectedDate}T${bookingData.selectedTime}`);
    const mexicoDateTime = toZonedTime(bookingDateTime, mexicoTimeZone);
    const formattedDate = format(mexicoDateTime, 'dd/MM/yyyy', { timeZone: mexicoTimeZone });
    const formattedTime = format(mexicoDateTime, 'HH:mm', { timeZone: mexicoTimeZone });
    const formattedDateTime = `${formattedDate} ${formattedTime} (México)`;

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(bookingData.amount * 100), // Convert to cents
      currency: "mxn",
      customer: customerId,
      metadata: {
        user_id: user.id,
        booking_date: formattedDate,
        booking_time: formattedTime,
        court_name: bookingData.selectedCourt,
        court_type: bookingData.selectedCourtType,
        environment: testMode ? 'test' : 'live',
        test_mode: testMode.toString(),
      },
      description: `Reserva de cancha - ${bookingData.selectedCourt} - ${formattedDateTime}`,
    });

    console.log("Payment Intent created:", paymentIntent.id);

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error creating payment intent:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});