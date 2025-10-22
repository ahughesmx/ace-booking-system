import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

interface DeleteBookingRequest {
  booking_id: string;
}

// Function to trigger configured webhooks
async function triggerWebhooks(
  supabaseAdmin: any,
  eventType: string,
  data: any
) {
  try {
    const { data: webhooks, error } = await supabaseAdmin
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
            webhook_name: webhook.name,
          }),
        });

        console.log(
          `✅ Webhook ${webhook.name} triggered with status:`,
          response.status
        );
      } catch (error) {
        console.error(
          `❌ Error triggering webhook ${webhook.name}:`,
          error.message
        );
      }
    }
  } catch (error) {
    console.error("❌ Error in triggerWebhooks:", error.message);
  }
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    });

    // Get the session or user object
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin
    const { data: userRole } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!userRole || userRole.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Only admins can delete test bookings" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const { booking_id }: DeleteBookingRequest = await req.json();

    if (!booking_id) {
      return new Response(
        JSON.stringify({ error: "booking_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`🗑️ Starting deletion process for booking: ${booking_id}`);

    // Create admin client using service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get complete booking data with JOINs before deletion
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .select(
        `
        id,
        user_id,
        court_id,
        start_time,
        end_time,
        status,
        payment_method,
        payment_id,
        payment_gateway,
        amount,
        currency,
        booking_made_at,
        payment_completed_at,
        profiles!inner(
          id,
          full_name,
          member_id,
          phone
        ),
        courts!inner(
          id,
          name,
          court_type
        )
      `
      )
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      console.error("❌ Booking not found:", bookingError?.message);
      return new Response(
        JSON.stringify({
          error: "Booking not found",
          details: bookingError?.message,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("📋 Booking data retrieved:", {
      id: booking.id,
      user: booking.profiles.full_name,
      court: booking.courts.name,
      status: booking.status,
    });

    // Prepare webhook data for booking_cancelled event
    const webhookData = {
      booking_id: booking.id,
      user_id: booking.user_id,
      user_name: booking.profiles.full_name,
      member_id: booking.profiles.member_id,
      user_phone: booking.profiles.phone,
      remotejid: booking.profiles.phone || "",
      court_id: booking.court_id,
      court_name: booking.courts.name,
      court_type: booking.courts.court_type,
      start_time: booking.start_time,
      end_time: booking.end_time,
      status: booking.status,
      payment_method: booking.payment_method,
      payment_id: booking.payment_id,
      payment_gateway: booking.payment_gateway,
      amount: booking.amount,
      currency: booking.currency,
      booking_made_at: booking.booking_made_at,
      payment_completed_at: booking.payment_completed_at,
      cancellation_reason: "test_booking_cleanup",
      deleted_by: user.id,
      deleted_at: new Date().toISOString(),
    };

    // Trigger booking_cancelled webhooks before deletion
    console.log("📤 Triggering booking_cancelled webhooks...");
    await triggerWebhooks(supabaseAdmin, "booking_cancelled", webhookData);

    // Delete the booking (CASCADE will handle related records)
    const { error: deleteError } = await supabaseAdmin
      .from("bookings")
      .delete()
      .eq("id", booking_id);

    if (deleteError) {
      console.error("❌ Error deleting booking:", deleteError.message);
      return new Response(
        JSON.stringify({
          error: "Failed to delete booking",
          details: deleteError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("✅ Booking deleted successfully");

    // Return success response with complete details
    return new Response(
      JSON.stringify({
        success: true,
        message: "Test booking deleted successfully",
        deleted_booking: {
          id: booking.id,
          user_name: booking.profiles.full_name,
          member_id: booking.profiles.member_id,
          court_name: booking.courts.name,
          court_type: booking.courts.court_type,
          start_time: booking.start_time,
          end_time: booking.end_time,
          status: booking.status,
          payment_method: booking.payment_method,
          payment_gateway: booking.payment_gateway,
          amount: booking.amount,
          currency: booking.currency,
        },
        webhook_notified: true,
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Unexpected error in delete-test-booking:", error.message);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
