import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

    // Enhanced debugging for Stripe configuration
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    console.log("🔑 Environment variables available:", Object.keys(Deno.env.toObject()));
    console.log("🔑 Stripe key available:", !!stripeKey);
    console.log("🔑 Stripe key length:", stripeKey ? stripeKey.length : 0);
    console.log("🔑 Stripe key starts with sk_:", stripeKey ? stripeKey.startsWith('sk_') : false);

    if (!stripeKey) {
      console.error("❌ STRIPE_SECRET_KEY is not available in environment variables");
      throw new Error("STRIPE_SECRET_KEY not configured. Please check Supabase Edge Function secrets.");
    }

    if (!stripeKey.startsWith('sk_')) {
      console.error("❌ STRIPE_SECRET_KEY appears to be invalid (should start with sk_)");
      throw new Error("Invalid STRIPE_SECRET_KEY format");
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

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

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(bookingData.amount * 100), // Convert to cents
      currency: "mxn",
      customer: customerId,
      metadata: {
        user_id: user.id,
        booking_date: bookingData.selectedDate,
        booking_time: bookingData.selectedTime,
        court_name: bookingData.selectedCourt,
        court_type: bookingData.selectedCourtType,
      },
      description: `Reserva de cancha - ${bookingData.selectedCourt} - ${bookingData.selectedDate} ${bookingData.selectedTime}`,
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