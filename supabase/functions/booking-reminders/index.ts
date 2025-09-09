import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BookingReminderSettings {
  hours_before_booking: number;
  is_enabled: boolean;
}

interface BookingWithProfile {
  id: string;
  start_time: string;
  end_time: string;
  court_id: string;
  user_id: string;
  profiles: {
    full_name: string;
    phone: string;
  };
  courts: {
    name: string;
    court_type: string;
  };
}

async function triggerWebhooks(eventType: string, data: any) {
  console.log(`Triggering webhooks for event: ${eventType}`);
  
  const { data: webhooks, error } = await supabase
    .from('webhooks')
    .select('*')
    .eq('event_type', eventType)
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching webhooks:', error);
    return;
  }

  if (!webhooks || webhooks.length === 0) {
    console.log(`No active webhooks found for event: ${eventType}`);
    return;
  }

  for (const webhook of webhooks) {
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(webhook.headers || {})
      };

      const payload = {
        event: eventType,
        timestamp: new Date().toISOString(),
        data: data,
        webhook_name: webhook.name
      };

      console.log(`Calling webhook: ${webhook.name} at ${webhook.url}`);
      
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        console.log(`✅ Webhook ${webhook.name} called successfully`);
      } else {
        console.error(`❌ Webhook ${webhook.name} failed with status: ${response.status}`);
      }
    } catch (error) {
      console.error(`❌ Error calling webhook ${webhook.name}:`, error);
    }
  }
}

async function processBookingReminders() {
  console.log('🔔 Starting booking reminders process...');

  // Get reminder settings
  const { data: settings, error: settingsError } = await supabase
    .from('booking_reminder_settings')
    .select('*')
    .limit(1)
    .single();

  if (settingsError || !settings) {
    console.error('Error fetching booking reminder settings:', settingsError);
    return { processed: 0, error: 'Settings not found' };
  }

  if (!settings.is_enabled) {
    console.log('📴 Booking reminders are disabled');
    return { processed: 0, message: 'Reminders disabled' };
  }

  // Calculate the target time for reminders (UTC, but accounting for Mexico timezone logic)
  const now = new Date();
  console.log(`⏰ Current UTC time: ${now.toISOString()}`);
  
  // Calculate target booking time: now + hours_before_booking
  const targetBookingTime = new Date(now.getTime() + (settings.hours_before_booking * 60 * 60 * 1000));
  console.log(`🎯 Target booking time (${settings.hours_before_booking}h from now): ${targetBookingTime.toISOString()}`);
  
  // Create a window of ±15 minutes around the target time for more precise matching
  const windowStart = new Date(targetBookingTime.getTime() - (15 * 60 * 1000)); // 15 minutes before
  const windowEnd = new Date(targetBookingTime.getTime() + (15 * 60 * 1000));   // 15 minutes after

  console.log(`🕐 Looking for bookings starting between ${windowStart.toISOString()} and ${windowEnd.toISOString()}`);

  // Check if there are active webhooks for booking reminders
  const { data: activeWebhooks, error: webhooksError } = await supabase
    .from('webhooks')
    .select('id')
    .eq('event_type', 'booking_reminder')
    .eq('is_active', true);

  if (webhooksError) {
    console.error('Error checking active webhooks:', webhooksError);
    return { processed: 0, error: 'Failed to check webhooks' };
  }

  if (!activeWebhooks || activeWebhooks.length === 0) {
    console.log('📭 No active webhooks found for booking_reminder event');
    return { processed: 0, message: 'No active reminder webhooks configured' };
  }

  console.log(`📡 Found ${activeWebhooks.length} active reminder webhook(s)`);

  // Find bookings that need reminders - FIXED: use correct foreign key names
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select(`
      id,
      start_time,
      end_time,
      court_id,
      user_id,
      profiles!bookings_user_id_fkey_profiles (full_name, phone),
      courts!bookings_court_id_fkey (name, court_type)
    `)
    .eq('status', 'paid')
    .gte('start_time', windowStart.toISOString())
    .lte('start_time', windowEnd.toISOString());

  if (bookingsError) {
    console.error('Error fetching bookings:', bookingsError);
    return { processed: 0, error: bookingsError.message };
  }

  if (!bookings || bookings.length === 0) {
    console.log('📭 No bookings found that need reminders');
    return { processed: 0, message: 'No bookings to remind' };
  }

  console.log(`📋 Found ${bookings.length} bookings that need reminders`);

  let processedCount = 0;

  for (const booking of bookings as BookingWithProfile[]) {
    try {
      const reminderData = {
        booking_id: booking.id,
        user_id: booking.user_id,
        user_name: booking.profiles.full_name,
        user_phone: booking.profiles.phone,
        remotejid: booking.profiles.phone,
        court_name: booking.courts.name,
        court_type: booking.courts.court_type,
        start_time: booking.start_time,
        end_time: booking.end_time,
        hours_before: settings.hours_before_booking,
        reminder_time: now.toISOString(),
        message: `Recordatorio: Tienes una reserva en ${booking.courts.name} el ${new Date(booking.start_time).toLocaleDateString('es-ES')} a las ${new Date(booking.start_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`
      };

      await triggerWebhooks('booking_reminder', reminderData);
      processedCount++;
      
      console.log(`✅ Processed reminder for booking ${booking.id} - ${booking.profiles.full_name}`);
    } catch (error) {
      console.error(`❌ Error processing reminder for booking ${booking.id}:`, error);
    }
  }

  console.log(`🎉 Booking reminders process completed. Processed: ${processedCount}/${bookings.length}`);
  return { processed: processedCount, total: bookings.length };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Booking reminders function called');
    
    const result = await processBookingReminders();
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error('❌ Error in booking reminders function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);