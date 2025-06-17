
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

// Enhanced security logging function
function logSecurityEvent(event: string, details: any = {}) {
  console.log(`[SECURITY] ${event}:`, {
    timestamp: new Date().toISOString(),
    ...details
  });
}

// Function to trigger configured webhooks
async function triggerWebhooks(eventType: string, data: any) {
  try {
    const { data: webhooks, error } = await supabase
      .from("webhooks")
      .select("*")
      .eq("event_type", eventType)
      .eq("is_active", true);

    if (error) {
      console.error("Error fetching webhooks:", error.message);
      return;
    }

    if (!webhooks || webhooks.length === 0) {
      console.log("No active webhooks found for event:", eventType);
      return;
    }

    for (const webhook of webhooks) {
      try {
        const headers = {
          "Content-Type": "application/json",
          ...webhook.headers,
        };

        const response = await fetch(webhook.url, {
          method: "POST",
          headers,
          body: JSON.stringify({
            event: eventType,
            timestamp: new Date().toISOString(),
            data,
            webhook_name: webhook.name
          }),
        });

        console.log(`Webhook ${webhook.name} triggered with status:`, response.status);
      } catch (error) {
        console.error(`Error triggering webhook ${webhook.name}:`, error.message);
        logSecurityEvent("WEBHOOK_FAILED", { 
          webhookName: webhook.name, 
          error: error.message 
        });
      }
    }
  } catch (error) {
    console.error("Error in triggerWebhooks:", error.message);
  }
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIP = req.headers.get("x-forwarded-for") || 
                   req.headers.get("x-real-ip") || 
                   "unknown";

  try {
    // Check content type
    const contentType = req.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      logSecurityEvent("INVALID_CONTENT_TYPE", { 
        contentType, 
        clientIP 
      });
      return new Response(
        JSON.stringify({ error: "Content-Type must be application/json" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body with size limit
    const text = await req.text();
    if (text.length > 10000) { // 10KB limit
      logSecurityEvent("REQUEST_TOO_LARGE", { 
        size: text.length, 
        clientIP 
      });
      return new Response(
        JSON.stringify({ error: "Request body too large" }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const requestData: WebhookRequest = JSON.parse(text);
    
    // Log sanitized request info (no API key)
    console.log("Webhook request received:", {
      date: requestData.date,
      time: requestData.time,
      courtId: requestData.courtId,
      userId: requestData.userId,
      clientIP
    });

    // Simple API key verification
    const validApiKey = Deno.env.get("WEBHOOK_API_KEY");
    if (!validApiKey || requestData.apiKey !== validApiKey) {
      logSecurityEvent("INVALID_API_KEY", { clientIP });
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate required fields
    if (!requestData.date || !requestData.time || !requestData.courtId || !requestData.userId) {
      logSecurityEvent("MISSING_REQUIRED_FIELDS", { 
        missingFields: {
          date: !requestData.date,
          time: !requestData.time,
          courtId: !requestData.courtId,
          userId: !requestData.userId
        },
        clientIP 
      });
      return new Response(
        JSON.stringify({ error: "Missing required fields: date, time, courtId, and userId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse date and validate booking time
    const selectedDate = new Date(requestData.date);
    const validationError = validateBookingTime(selectedDate, requestData.time);
    if (validationError) {
      logSecurityEvent("INVALID_BOOKING_TIME", { 
        error: validationError, 
        date: requestData.date,
        time: requestData.time,
        clientIP 
      });
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
      logSecurityEvent("COURT_NOT_FOUND", { 
        courtId: requestData.courtId, 
        clientIP 
      });
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
      logSecurityEvent("USER_NOT_FOUND", { 
        userId: requestData.userId, 
        clientIP 
      });
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
      console.error("Error fetching booking rules:", rulesError?.message);
      return new Response(
        JSON.stringify({ error: "Error interno al obtener reglas de reservación" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check active bookings limit
    if (user.active_bookings >= rules.max_active_bookings) {
      logSecurityEvent("MAX_BOOKINGS_EXCEEDED", { 
        userId: requestData.userId,
        activeBookings: user.active_bookings,
        maxAllowed: rules.max_active_bookings,
        clientIP 
      });
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
      console.error("Error creating booking times");
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
      console.error("Error checking existing bookings:", bookingsError.message);
      return new Response(
        JSON.stringify({ error: "Error al verificar disponibilidad de la cancha" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingBookings && existingBookings.length > 0) {
      logSecurityEvent("COURT_NOT_AVAILABLE", { 
        courtId: requestData.courtId,
        requestedTime: requestData.time,
        existingBookings: existingBookings.length,
        clientIP 
      });
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

    // Create the booking with user_id
    const { data: booking, error: insertError } = await supabase
      .from("bookings")
      .insert({
        court_id: requestData.courtId,
        user_id: requestData.userId,
        start_time: times.startTime.toISOString(),
        end_time: times.endTime.toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Booking creation error:", insertError.message);
      logSecurityEvent("BOOKING_CREATION_FAILED", { 
        error: insertError.message,
        userId: requestData.userId,
        courtId: requestData.courtId,
        clientIP 
      });
      
      let errorMessage = "No se pudo realizar la reserva. Por favor intenta de nuevo.";
      
      if (insertError.message.includes("violates row-level security policy")) {
        errorMessage = "No tienes permiso para realizar esta reserva";
      }
      
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log successful booking creation
    logSecurityEvent("BOOKING_CREATED", { 
      bookingId: booking.id,
      userId: requestData.userId,
      courtId: requestData.courtId,
      courtName: court.name,
      clientIP 
    });

    // Trigger configured webhooks for booking_created event
    const bookingData = {
      id: booking.id,
      courtName: court.name,
      courtId: requestData.courtId,
      startTime: times.startTime.toISOString(),
      endTime: times.endTime.toISOString(),
      userName: user.full_name,
      userId: requestData.userId,
      date: requestData.date,
      time: requestData.time
    };

    await triggerWebhooks("booking_created", bookingData);

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: "Reserva creada exitosamente",
        booking: bookingData
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error in booking webhook:", error.message);
    logSecurityEvent("UNEXPECTED_ERROR", { 
      error: error.message,
      clientIP 
    });
    return new Response(
      JSON.stringify({ 
        error: "Error interno del servidor"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
