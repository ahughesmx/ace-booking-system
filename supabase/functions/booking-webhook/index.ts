
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";
import { corsHeaders } from "../_shared/cors.ts";
import { validateBookingTime } from "./validation.ts";
import { createBookingTimes } from "./time-utils.ts";

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface WebhookRequest {
  date: string;       // ISO format date string (YYYY-MM-DD)
  time: string;       // Time in format "HH:00"
  courtId: string;    // UUID of the court
  userId: string;     // UUID of the user making the booking
  apiKey: string;     // Simple API key for basic authentication
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check content type
    const contentType = req.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return new Response(
        JSON.stringify({ error: "Content-Type must be application/json" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const requestData: WebhookRequest = await req.json();
    console.log("Webhook request received:", requestData);

    // Simple API key verification
    const validApiKey = Deno.env.get("WEBHOOK_API_KEY");
    if (!validApiKey || requestData.apiKey !== validApiKey) {
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate required fields
    if (!requestData.date || !requestData.time || !requestData.courtId || !requestData.userId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: date, time, courtId, and userId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse date and validate booking time
    const selectedDate = new Date(requestData.date);
    const validationError = validateBookingTime(selectedDate, requestData.time);
    if (validationError) {
      return new Response(
        JSON.stringify({ error: validationError }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if court exists
    const { data: court, error: courtError } = await supabase
      .from("courts")
      .select("id, name")
      .eq("id", requestData.courtId)
      .single();

    if (courtError || !court) {
      console.error("Court not found:", courtError);
      return new Response(
        JSON.stringify({ error: "La cancha especificada no existe" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from("profiles")
      .select("id, full_name, active_bookings")
      .eq("id", requestData.userId)
      .single();

    if (userError || !user) {
      console.error("User not found:", userError);
      return new Response(
        JSON.stringify({ error: "El usuario especificado no existe" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get booking rules
    const { data: rules, error: rulesError } = await supabase
      .from("booking_rules")
      .select("*")
      .single();

    if (rulesError || !rules) {
      console.error("Error fetching booking rules:", rulesError);
      return new Response(
        JSON.stringify({ error: "Error interno al obtener reglas de reservación" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check active bookings limit
    if (user.active_bookings >= rules.max_active_bookings) {
      return new Response(
        JSON.stringify({ 
          error: `El usuario ya tiene el máximo de ${rules.max_active_bookings} reservas activas permitidas` 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate booking times
    const times = createBookingTimes(selectedDate, requestData.time);
    if (!times) {
      return new Response(
        JSON.stringify({ error: "Error al crear los horarios de la reserva" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if the court is available at the requested time
    const { data: existingBookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("id")
      .eq("court_id", requestData.courtId)
      .lte("start_time", times.endTime.toISOString())
      .gte("end_time", times.startTime.toISOString());

    if (bookingsError) {
      console.error("Error checking existing bookings:", bookingsError);
      return new Response(
        JSON.stringify({ error: "Error al verificar disponibilidad de la cancha" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingBookings && existingBookings.length > 0) {
      return new Response(
        JSON.stringify({ 
          error: "La cancha no está disponible para el horario solicitado",
          available: false,
          courtName: court.name,
          requestedDate: selectedDate.toLocaleDateString('es-MX'),
          requestedTime: requestData.time
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the booking
    const { data: booking, error: insertError } = await supabase
      .from("bookings")
      .insert({
        court_id: requestData.courtId,
        user_id: requestData.userId,
        start_time: times.startTime.toISOString(),
        end_time: times.endTime.toISOString(),
        booking_made_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating booking:", insertError);
      // Try to parse the error message from the database trigger
      let errorMessage = "No se pudo realizar la reserva. Por favor intenta de nuevo.";
      
      try {
        // Check if the error is from our RLS policy
        if (insertError.message.includes("violates row-level security policy")) {
          errorMessage = "No tienes permiso para realizar esta reserva";
        } else {
          const parsedError = JSON.parse(insertError.message);
          errorMessage = parsedError.message || errorMessage;
        }
      } catch {
        // If parsing fails, use the raw message
        errorMessage = insertError.message || errorMessage;
      }
      
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: "Reserva creada exitosamente",
        booking: {
          id: booking.id,
          courtName: court.name,
          startTime: times.startTime.toISOString(),
          endTime: times.endTime.toISOString(),
          userName: user.full_name
        }
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error in booking webhook:", error);
    return new Response(
      JSON.stringify({ 
        error: "Error interno del servidor", 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
