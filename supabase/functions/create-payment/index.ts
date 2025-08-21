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
    console.log("🚀 create-payment function started");
    
    // Create Supabase client with anon key for manual auth
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Manual user authentication - since verify_jwt = false
    let user = null;
    const authHeader = req.headers.get("Authorization");
    console.log("🔑 Auth header present:", !!authHeader);
    
    if (authHeader) {
      try {
        const token = authHeader.replace("Bearer ", "");
        const { data, error } = await supabaseClient.auth.getUser(token);
        console.log("👤 User auth result:", { hasUser: !!data.user, error: error?.message });
        user = data.user;
        if (!user?.email) {
          console.error("❌ No user email found");
          throw new Error("User not authenticated");
        }
      } catch (authError) {
        console.error("❌ Authentication failed:", authError);
        throw new Error("Authentication failed");
      }
    } else {
      console.error("❌ No authorization header");
      throw new Error("No authorization header");
    }

    // Parse request body
    const { bookingData } = await req.json();
    if (!bookingData) {
      throw new Error("Booking data is required");
    }

    console.log("Creating Stripe Checkout Session for booking:", bookingData);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
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

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Reserva de cancha - ${bookingData.selectedCourt}`,
              description: `${bookingData.selectedDate} ${bookingData.selectedTime}`,
            },
            unit_amount: Math.round(bookingData.amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/`,
      metadata: {
        user_id: user.id,
        booking_date: bookingData.selectedDate,
        booking_time: bookingData.selectedTime,
        court_name: bookingData.selectedCourt,
        court_type: bookingData.selectedCourtType,
      },
    });

    console.log("Checkout Session created:", session.id);

    return new Response(
      JSON.stringify({
        url: session.url,
        sessionId: session.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});