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
    console.log('🗑️ Delete test booking function called');

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
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log("✅ Admin client created with service role");

    // Delete the booking directly
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

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: "Test booking deleted successfully",
        booking_id: booking_id,
        deleted_at: new Date().toISOString(),
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
