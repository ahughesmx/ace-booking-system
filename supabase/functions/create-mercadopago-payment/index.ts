import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🟦 MercadoPago Payment Function called');

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

    // Authenticate user
    const authHeader = req.headers.get('authorization');
    console.log('🔑 Auth header present:', !!authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ No authorization header');
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('❌ User authentication failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: corsHeaders }
      );
    }

    console.log('✅ User authenticated:', user.email);

    // Parse request body
    const { bookingData } = await req.json();
    console.log('📥 Booking data received:', bookingData);

    if (!bookingData) {
      return new Response(
        JSON.stringify({ error: 'Missing booking data' }),
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

    // Get the appropriate access token
    const accessToken = isTestMode ? config.accessTokenTest : config.accessTokenLive;
    
    if (!accessToken) {
      console.error('❌ MercadoPago access token not configured');
      return new Response(
        JSON.stringify({ error: 'MercadoPago configuration incomplete' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Format the booking data
    const startDate = new Date(bookingData.selectedDate);
    const formattedDate = startDate.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      timeZone: 'America/Mexico_City'
    });

    // Create MercadoPago preference
    const preferenceData = {
      items: [
        {
          title: `Reserva de ${bookingData.selectedCourtType} - ${bookingData.selectedCourt}`,
          description: `Reserva para ${formattedDate} a las ${bookingData.selectedTime}`,
          quantity: 1,
          unit_price: Number(bookingData.amount),
          currency_id: "MXN"
        }
      ],
      payer: {
        email: user.email,
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario'
      },
      back_urls: {
        success: `${req.headers.get('origin') || 'https://bpjinatcgdmxqetfxjji.netlify.app'}/booking-success?gateway=mercadopago`,
        failure: `${req.headers.get('origin') || 'https://bpjinatcgdmxqetfxjji.netlify.app'}/booking?error=payment_failed`,
        pending: `${req.headers.get('origin') || 'https://bpjinatcgdmxqetfxjji.netlify.app'}/booking?status=pending`
      },
      auto_return: "approved",
      external_reference: `booking_${Date.now()}_${user.id}`,
      metadata: {
        user_id: user.id,
        user_email: user.email,
        court: bookingData.selectedCourt,
        court_type: bookingData.selectedCourtType,
        date: startDate.toISOString(),
        time: bookingData.selectedTime,
        amount: bookingData.amount
      }
    };

    console.log('📤 Creating MercadoPago preference:', preferenceData);

    // Call MercadoPago API
    const mpApiUrl = isTestMode 
      ? 'https://api.mercadopago.com/checkout/preferences'
      : 'https://api.mercadopago.com/checkout/preferences';

    const response = await fetch(mpApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferenceData)
    });

    const responseData = await response.json();
    console.log('📥 MercadoPago API response:', responseData);

    if (!response.ok) {
      console.error('❌ MercadoPago API error:', responseData);
      return new Response(
        JSON.stringify({ error: 'MercadoPago API error', details: responseData }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!responseData.init_point) {
      console.error('❌ No init_point received from MercadoPago');
      return new Response(
        JSON.stringify({ error: 'Invalid MercadoPago response' }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('✅ MercadoPago preference created successfully');
    
    // Use the correct URL based on test mode
    const checkoutUrl = isTestMode ? responseData.sandbox_init_point : responseData.init_point;
    
    console.log(`🔗 Using ${isTestMode ? 'SANDBOX' : 'PRODUCTION'} URL:`, checkoutUrl);
    
    return new Response(
      JSON.stringify({
        preferenceId: responseData.id,
        initPoint: checkoutUrl,
        isTestMode: isTestMode
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