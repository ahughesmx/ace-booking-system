import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export interface StripeConfig {
  stripe: Stripe;
  testMode: boolean;
  publishableKey: string;
}

export async function getStripeConfig(): Promise<StripeConfig> {
  console.log("🔧 getStripeConfig: Fetching Stripe configuration...");
  
  // Create Supabase client with service role key to bypass RLS
  const supabaseService = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  // Fetch Stripe gateway configuration from database
  const { data: stripeGateway, error } = await supabaseService
    .from("payment_gateways")
    .select("test_mode, configuration")
    .eq("name", "stripe")
    .eq("enabled", true)
    .single();

  if (error) {
    console.error("❌ Error fetching Stripe gateway configuration:", error);
    throw new Error("Stripe gateway not configured or not enabled");
  }

  if (!stripeGateway) {
    console.error("❌ No Stripe gateway found");
    throw new Error("Stripe gateway not found");
  }

  const testMode = stripeGateway.test_mode;
  const config = stripeGateway.configuration as any;

  console.log("🔍 Stripe configuration retrieved:", {
    testMode,
    hasTestKey: !!config.secretKeyTest,
    hasLiveKey: !!config.secretKeyLive,
    hasTestPublishable: !!config.publishableKeyTest,
    hasLivePublishable: !!config.publishableKeyLive
  });

  // Get the appropriate secret key from environment
  const stripeSecretKey = testMode
    ? Deno.env.get("STRIPE_SECRET_KEY_TEST")
    : Deno.env.get("STRIPE_SECRET_KEY_LIVE");

  const publishableKey = testMode
    ? config.publishableKeyTest
    : config.publishableKeyLive;

  if (!stripeSecretKey) {
    const keyType = testMode ? "TEST" : "LIVE";
    console.error(`❌ STRIPE_SECRET_KEY_${keyType} not configured in environment`);
    throw new Error(`Stripe ${keyType} secret key not configured`);
  }

  if (!publishableKey) {
    const keyType = testMode ? "test" : "live";
    console.error(`❌ Stripe ${keyType} publishable key not configured in database`);
    throw new Error(`Stripe ${keyType} publishable key not configured`);
  }

  // Validate key format
  const expectedPrefix = testMode ? "sk_test_" : "sk_live_";
  if (!stripeSecretKey.startsWith(expectedPrefix)) {
    console.error(`❌ Invalid Stripe secret key format. Expected ${expectedPrefix}* but got ${stripeSecretKey.substring(0, 8)}...`);
    throw new Error(`Invalid Stripe secret key format for ${testMode ? 'test' : 'live'} mode`);
  }

  console.log(`✅ Using Stripe ${testMode ? 'TEST' : 'LIVE'} mode`);
  console.log(`✅ Secret key starts with: ${stripeSecretKey.substring(0, 10)}...`);
  console.log(`✅ Publishable key starts with: ${publishableKey.substring(0, 10)}...`);

  // Initialize Stripe with the correct key
  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2023-10-16",
  });

  return {
    stripe,
    testMode,
    publishableKey
  };
}
