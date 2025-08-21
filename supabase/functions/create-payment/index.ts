import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { format } from "https://esm.sh/date-fns@3.6.0";
import { toZonedTime } from "https://esm.sh/date-fns-tz@3.2.0";

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
    console.log("📋 Request method:", req.method);
    console.log("📋 Request headers:", Object.fromEntries(req.headers.entries()));
    
    // Create Supabase client with anon key for manual auth
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    console.log("🔧 Supabase client created successfully");

    // Manual user authentication - since verify_jwt = false
    let user = null;
    const authHeader = req.headers.get("Authorization");
    console.log("🔑 Auth header present:", !!authHeader);
    console.log("🔑 Auth header value:", authHeader ? `${authHeader.substring(0, 20)}...` : "null");
    
    if (authHeader) {
      try {
        const token = authHeader.replace("Bearer ", "");
        console.log("🔑 Token extracted, length:", token.length);
        
        const { data, error } = await supabaseClient.auth.getUser(token);
        console.log("👤 User auth result:", { 
          hasUser: !!data.user, 
          userId: data.user?.id, 
          userEmail: data.user?.email,
          error: error?.message 
        });
        
        user = data.user;
        if (!user?.email) {
          console.error("❌ No user email found. User object:", user);
          throw new Error("User not authenticated - no email");
        }
        console.log("✅ User authenticated successfully:", user.email);
      } catch (authError) {
        console.error("❌ Authentication failed:", authError);
        console.error("❌ Auth error details:", {
          message: authError.message,
          stack: authError.stack
        });
        throw new Error(`Authentication failed: ${authError.message}`);
      }
    } else {
      console.error("❌ No authorization header provided");
      throw new Error("No authorization header");
    }

    // Parse request body
    console.log("📦 Parsing request body...");
    let requestBody;
    try {
      const bodyText = await req.text();
      console.log("📦 Raw body:", bodyText);
      requestBody = JSON.parse(bodyText);
      console.log("📦 Parsed body:", requestBody);
    } catch (parseError) {
      console.error("❌ Failed to parse request body:", parseError);
      throw new Error("Invalid JSON in request body");
    }

    const { bookingData } = requestBody;
    if (!bookingData) {
      console.error("❌ No bookingData in request:", requestBody);
      throw new Error("Booking data is required");
    }

    console.log("📋 Booking data received:", {
      selectedDate: bookingData.selectedDate,
      selectedTime: bookingData.selectedTime,
      selectedCourt: bookingData.selectedCourt,
      selectedCourtType: bookingData.selectedCourtType,
      amount: bookingData.amount
    });

    // Validate required fields
    const requiredFields = ['selectedDate', 'selectedTime', 'selectedCourt', 'selectedCourtType', 'amount'];
    const missingFields = requiredFields.filter(field => !bookingData[field]);
    if (missingFields.length > 0) {
      console.error("❌ Missing required fields:", missingFields);
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    console.log("✅ All required booking data fields present");

    // Initialize Stripe
    console.log("🔧 Initializing Stripe...");
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    
    if (!stripeKey) {
      console.error("❌ STRIPE_SECRET_KEY not found in environment");
      throw new Error("Stripe secret key not configured");
    }
    
    console.log("🔑 Stripe key available:", !!stripeKey);
    console.log("🔑 Stripe key starts with sk_:", stripeKey.startsWith('sk_'));
    
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    console.log("✅ Stripe initialized successfully");

    // Check if customer exists or create new one
    console.log("👤 Checking for existing Stripe customer:", user.email);
    const customers = await stripe.customers.list({ 
      email: user.email, 
      limit: 1 
    });
    
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log("✅ Found existing customer:", customerId);
    } else {
      console.log("👤 Creating new Stripe customer for:", user.email);
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.user_metadata?.full_name || user.email,
      });
      customerId = customer.id;
      console.log("✅ Created new customer:", customerId);
    }

    // Create checkout session
    console.log("💳 Creating Stripe checkout session...");
    
    // Format date and time for Mexico timezone
    const mexicoTimeZone = 'America/Mexico_City';
    const bookingDateTime = new Date(`${bookingData.selectedDate}T${bookingData.selectedTime}`);
    const mexicoDateTime = toZonedTime(bookingDateTime, mexicoTimeZone);
    const formattedDate = format(mexicoDateTime, 'dd/MM/yyyy', { timeZone: mexicoTimeZone });
    const formattedTime = format(mexicoDateTime, 'HH:mm', { timeZone: mexicoTimeZone });
    const formattedDateTime = `${formattedDate} ${formattedTime} (México)`;
    
    const sessionData = {
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: "mxn",
            product_data: {
              name: `Reserva de cancha - ${bookingData.selectedCourt}`,
              description: formattedDateTime,
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
        booking_date: formattedDate,
        booking_time: formattedTime,
        court_name: bookingData.selectedCourt,
        court_type: bookingData.selectedCourtType,
      },
    };

    console.log("💳 Session configuration:", {
      customer: customerId,
      amount: Math.round(bookingData.amount * 100),
      currency: "mxn",
      success_url: sessionData.success_url,
      cancel_url: sessionData.cancel_url
    });

    const session = await stripe.checkout.sessions.create(sessionData);
    console.log("✅ Checkout Session created successfully:", {
      sessionId: session.id,
      url: session.url,
      customer: session.customer
    });

    const responseData = {
      url: session.url,
      sessionId: session.id,
    };

    console.log("✅ Returning success response:", responseData);

    return new Response(
      JSON.stringify(responseData),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("❌ Error creating checkout session:", error);
    console.error("❌ Error stack:", error.stack);
    console.error("❌ Error details:", {
      name: error.name,
      message: error.message,
      cause: error.cause
    });
    
    const errorResponse = { 
      error: error.message || "Internal server error",
      details: error.stack ? error.stack.split('\n')[0] : "No stack trace available"
    };
    
    console.log("❌ Returning error response:", errorResponse);
    
    return new Response(
      JSON.stringify(errorResponse),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});