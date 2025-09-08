import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🟦 MercadoPago Payment Verification Function called');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request body
    const { paymentId, preferenceId } = await req.json();
    console.log('📥 Verification data received:', { paymentId, preferenceId });

    if (!paymentId) {
      return new Response(
        JSON.stringify({ error: 'Missing payment ID' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Get MercadoPago configuration
    const { data: gatewayConfig, error: configError } = await supabase
      .from('payment_gateways')
      .select('*')
      .eq('name', 'mercadopago')
      .eq('enabled', true)
      .single();

    if (configError || !gatewayConfig) {
      console.error('❌ MercadoPago not configured or enabled:', configError);
      return new Response(
        JSON.stringify({ error: 'MercadoPago not available' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const config = gatewayConfig.configuration as any;
    const isTestMode = gatewayConfig.test_mode;
    const accessToken = isTestMode ? config.accessTokenTest : config.accessTokenLive;

    if (!accessToken) {
      console.error('❌ MercadoPago access token not configured');
      return new Response(
        JSON.stringify({ error: 'MercadoPago configuration incomplete' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Verify payment with MercadoPago API
    // Use the same base URL for both test and production, but different access tokens
    const mpApiUrl = `https://api.mercadopago.com/v1/payments/${paymentId}`;
    
    console.log('📤 Calling MercadoPago API to verify payment:', mpApiUrl);
    console.log('🔧 Using test mode:', isTestMode);
    console.log('🔍 Payment ID received:', paymentId);
    console.log('🔍 Preference ID received:', preferenceId);

    // Retry mechanism for payment verification (MercadoPago may need time to process)
    let paymentData;
    let response;
    const maxRetries = 3; // Reducido de 5 a 3 para no esperar tanto
    const retryDelay = 2000; // Reducido de 3 a 2 segundos

    console.log('🔍 Starting payment verification process...');
    console.log('🔍 Payment ID to verify:', paymentId);
    console.log('🔍 Access Token (first 10 chars):', accessToken.substring(0, 10) + '...');

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`🔄 Payment verification attempt ${attempt}/${maxRetries}`);
      
      if (attempt > 1) {
        // Wait before retrying
        console.log(`⏱️ Waiting ${retryDelay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }

      response = await fetch(mpApiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      });

      paymentData = await response.json();
      console.log(`📋 Attempt ${attempt} response status:`, response.status);
      console.log(`📋 Attempt ${attempt} response data:`, JSON.stringify(paymentData, null, 2));
      
      if (response.ok) {
        console.log('✅ Payment found on attempt', attempt);
        break;
      } else if (response.status === 404 && attempt < maxRetries) {
        console.log(`⏱️ Payment not found yet (404), retrying... (attempt ${attempt}/${maxRetries})`);
        continue;
      } else if (response.status === 404) {
        // Si después de todos los intentos sigue siendo 404, intentar con merchant order
        console.log('🔄 Payment ID not found, trying to find payment via merchant order...');
        
        if (preferenceId) {
          try {
            // Intentar buscar el pago usando la preference
            const merchantOrderUrl = `https://api.mercadopago.com/merchant_orders`;
            const merchantResponse = await fetch(`${merchantOrderUrl}?preference_id=${preferenceId}`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              }
            });
            
            const merchantData = await merchantResponse.json();
            console.log('🔍 Merchant order search response:', JSON.stringify(merchantData, null, 2));
            
            if (merchantResponse.ok && merchantData.results && merchantData.results.length > 0) {
              const merchantOrder = merchantData.results[0];
              if (merchantOrder.payments && merchantOrder.payments.length > 0) {
                const actualPaymentId = merchantOrder.payments[0].id;
                console.log('✅ Found actual payment ID via merchant order:', actualPaymentId);
                
                // Reintentar con el ID correcto
                const correctPaymentUrl = `https://api.mercadopago.com/v1/payments/${actualPaymentId}`;
                const correctResponse = await fetch(correctPaymentUrl, {
                  method: 'GET',
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                  }
                });
                
                if (correctResponse.ok) {
                  paymentData = await correctResponse.json();
                  response = correctResponse;
                  console.log('✅ Payment found with correct ID:', actualPaymentId);
                  break;
                }
              }
            }
          } catch (merchantError) {
            console.log('❌ Error searching merchant orders:', merchantError);
          }
        }
        
        console.log(`❌ Failed on attempt ${attempt} with status ${response.status}`);
      } else {
        console.log(`❌ Failed on attempt ${attempt} with status ${response.status}`);
      }
    }
    console.log('📥 MercadoPago payment verification response:', paymentData);

    if (!response.ok) {
      console.error('❌ MercadoPago API error:', paymentData);
      return new Response(
        JSON.stringify({ error: 'MercadoPago verification failed', details: paymentData }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if payment was approved
    if (paymentData.status !== 'approved') {
      console.log('❌ Payment not approved. Status:', paymentData.status);
      return new Response(
        JSON.stringify({ 
          error: 'Payment not approved', 
          status: paymentData.status,
          statusDetail: paymentData.status_detail 
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Extract metadata from the payment
    const metadata = paymentData.metadata || {};
    const userId = metadata.user_id;
    
    if (!userId) {
      console.error('❌ No user ID in payment metadata');
      return new Response(
        JSON.stringify({ error: 'Invalid payment metadata' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Find the pending booking for this user
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending_payment')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (bookingError || !booking) {
      console.error('❌ No pending booking found for user:', userId, bookingError);
      return new Response(
        JSON.stringify({ error: 'No pending booking found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    console.log('📋 Found booking to update:', booking.id);

    // Update booking status to paid
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'paid',
        payment_gateway: 'mercadopago',
        payment_method: 'mercadopago',
        payment_completed_at: new Date().toISOString(),
        payment_id: paymentData.id.toString(),
        actual_amount_charged: paymentData.transaction_amount,
        expires_at: null
      })
      .eq('id', booking.id);

    if (updateError) {
      console.error('❌ Error updating booking:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update booking' }),
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('✅ Booking updated successfully');

    // Trigger booking_created webhooks
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      const { data: court } = await supabase
        .from("courts")
        .select("*")
        .eq("id", booking.court_id)
        .single();

      const webhookData = {
        booking_id: booking.id,
        user_id: userId,
        court_id: booking.court_id,
        start_time: booking.start_time,
        end_time: booking.end_time,
        status: 'paid',
        amount: booking.amount,
        court_name: court?.name,
        court_type: court?.court_type,
        user_name: profile?.full_name,
        user_phone: profile?.phone,
        remotejid: profile?.phone,
        date: new Date(booking.start_time).toISOString().split('T')[0],
        time: new Date(booking.start_time).toLocaleTimeString('es-ES', { 
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: false 
        })
      };

      // Get active webhooks
      const { data: webhooks } = await supabase
        .from("webhooks")
        .select("*")
        .eq("event_type", "booking_created")
        .eq("is_active", true);

      if (webhooks && webhooks.length > 0) {
        console.log(`🚀 Triggering ${webhooks.length} webhooks`);
        for (const webhook of webhooks) {
          try {
            const customHeaders = webhook.headers as Record<string, string> || {};
            const headers: Record<string, string> = {
              "Content-Type": "application/json",
              ...customHeaders,
            };

            await fetch(webhook.url, {
              method: "POST",
              headers,
              body: JSON.stringify({
                event: "booking_created",
                timestamp: new Date().toISOString(),
                data: webhookData,
                webhook_name: webhook.name
              }),
            });

            console.log(`✅ Webhook ${webhook.name} triggered successfully`);
          } catch (webhookError) {
            console.error(`❌ Error triggering webhook ${webhook.name}:`, webhookError);
          }
        }
      }
    } catch (webhookError) {
      console.error("❌ Error processing webhooks:", webhookError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        bookingId: booking.id,
        paymentId: paymentData.id,
        amount: paymentData.transaction_amount
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});