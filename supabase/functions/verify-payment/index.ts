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

        return new Response(JSON.stringify({ 
          success: true, 
          message: "Pago verificado y reserva confirmada",
          booking: existingBooking
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