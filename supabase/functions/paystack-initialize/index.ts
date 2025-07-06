// supabase/functions/paystack-initialize/index.ts
// Deno Standard Modules
import { serve } from 'https://deno.land/std@0.217.0/http/server.ts';

// Supabase Client
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

console.log('[Paystack-Initialize] Edge Function cold start.');

// Define CORS headers directly inside the function
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};


interface InitializePayload {
  amount: number; // Amount in major currency unit (e.g., GHS)
  email: string;
  orderId: string;
  currency?: string;
  cartItems?: Array<{ id: string; name: string; quantity: number; price: number }>;
  // Add any other metadata you want to pass to Paystack or use in your function
}

serve(async (req: Request) => {
  // Immediately handle OPTIONS preflight request
  if (req.method === 'OPTIONS') {
    console.log('[Paystack-Initialize] Handling OPTIONS request.');
    return new Response('ok', { headers: corsHeaders });
  }

  console.log(`[Paystack-Initialize] Received ${req.method} request.`);

  try {
    // Ensure environment variables are available
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const siteUrl = Deno.env.get('SITE_URL'); // Crucial for callback_url

    if (!supabaseUrl || !serviceRoleKey || !siteUrl) {
      console.error('[Paystack-Initialize] Missing one or more environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SITE_URL.');
      return new Response(JSON.stringify({ error: 'Server configuration error: Missing critical environment variables.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Create a Supabase client with the service_role key to access Vault
    const supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey);

    // Parse request body
    let payload: InitializePayload;
    try {
      payload = await req.json();
    } catch (e) {
      console.error('[Paystack-Initialize] Error parsing request JSON:', e.message);
      return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    
    console.log('[Paystack-Initialize] Parsed payload:', payload);

    const { amount, email, orderId, currency = 'GHS', cartItems } = payload;

    if (!amount || !email || !orderId) {
      console.warn('[Paystack-Initialize] Missing required fields in payload.');
      return new Response(JSON.stringify({ error: 'Missing required fields: amount, email, or orderId.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // 1. Retrieve Paystack Secret Key from Vault
    console.log("[Paystack-Initialize] Attempting to retrieve 'PAYSTACK_SECRET_KEY' from Vault.");
    const { data: secretData, error: secretError } = await supabaseAdminClient
      .rpc('get_secret', { secret_name: 'PAYSTACK_SECRET_KEY' }); // Use the helper or directly query decrypted_secrets if preferred

    if (secretError || !secretData) {
      console.error('[Paystack-Initialize] Error fetching Paystack secret key from Vault:', secretError?.message || 'No data returned');
      return new Response(JSON.stringify({ error: 'Could not retrieve Paystack API key. Check Vault configuration and function permissions.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    const paystackSecretKey = secretData;
    console.log("[Paystack-Initialize] Successfully retrieved Paystack secret key from Vault.");

    // 2. Prepare data for Paystack API
    // Paystack expects amount in the smallest currency unit (kobo for NGN, pesewas for GHS)
    const amountInPesewas = Math.round(amount * 100);
    const uniqueReference = `kdm_${orderId.substring(0,10)}_${Date.now()}`; // Ensure reference is unique

    const paystackApiPayload = {
      email: email,
      amount: amountInPesewas,
      currency: currency,
      reference: uniqueReference,
      metadata: {
        order_id: orderId,
        customer_email: email,
        cart_items_count: cartItems?.length || 0,
        // You can serialize cartItems if needed, but keep metadata under Paystack's limits
        // cart_items_detail: JSON.stringify(cartItems), // Example if you need full cart details
      },
      callback_url: `${siteUrl}/payment-callback`, // Your app's page to handle redirect after payment attempt
    };
    console.log('[Paystack-Initialize] Payload for Paystack API:', JSON.stringify(paystackApiPayload, null, 2));
    
    // 3. Call Paystack API to initialize transaction
    console.log('[Paystack-Initialize] Calling Paystack API to initialize transaction...');
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paystackApiPayload),
    });

    const paystackResult = await paystackResponse.json();
    console.log('[Paystack-Initialize] Paystack API response status:', paystackResponse.status);
    console.log('[Paystack-Initialize] Paystack API response body:', paystackResult);

    if (!paystackResponse.ok || !paystackResult.status) { // Paystack API returns a 'status: true' on success
      console.error('[Paystack-Initialize] Paystack API Error:', paystackResult.message || 'Unknown error from Paystack');
      return new Response(JSON.stringify({ error: paystackResult.message || 'Failed to initialize Paystack transaction.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: paystackResponse.status, // Propagate Paystack's error status if available
      });
    }

    if (!paystackResult.data || !paystackResult.data.authorization_url) {
        console.error('[Paystack-Initialize] Paystack API Error: authorization_url not found in response data.');
        return new Response(JSON.stringify({ error: 'Paystack did not return an authorization URL.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }

    // 4. Return the authorization_url and reference to the client
    console.log('[Paystack-Initialize] Successfully initialized Paystack transaction. Returning authorization_url and reference.');
    return new Response(JSON.stringify({ 
        authorization_url: paystackResult.data.authorization_url,
        reference: paystackResult.data.reference, // Return the reference as it's useful for tracking
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    // Catch any unexpected errors during the function execution
    console.error('[Paystack-Initialize] Critical error in Edge Function:', error.message, error.stack);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error occurred.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

/*
Reminder for local development and deployment:

1. Install Deno: https://deno.land/#installation
2. Install Supabase CLI: https://supabase.com/docs/guides/cli
3. Login to Supabase CLI: supabase login
4. Link your project: supabase link --project-ref <your-project-ref>
5. (Optional) Set local env vars: Create 'supabase/.env' file with:
   SITE_URL=http://localhost:9002 # Or your Next.js dev port
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here # Get from Supabase Dashboard > Project Settings > API
   # SUPABASE_URL and SUPABASE_ANON_KEY are usually set by 'supabase start'
6. Start local Supabase services: supabase start (if not already running)
7. Serve the function locally for testing:
   supabase functions serve paystack-initialize --no-verify-jwt --env-file ./supabase/.env
8. Deploy the function:
   supabase functions deploy paystack-initialize --project-ref <your-project-ref> --no-verify-jwt
   (For production, consider JWT verification or other auth mechanisms if needed for this function)
9. Set SITE_URL (and any other necessary env vars) in Supabase Dashboard > Project Settings > Environment Variables for the deployed function.
10. Create the payment-callback page in your Next.js app.
11. Implement a separate Edge Function to handle Paystack Webhooks for payment confirmation.
*/

/*
To access secrets, Supabase documentation suggests creating a helper function 
or using the `decrypted_secrets` view if direct access is needed and permissible.
The `rpc('get_secret', { secret_name: 'YOUR_SECRET' })` approach assumes you have 
a PostgreSQL function `get_secret` like this:

CREATE OR REPLACE FUNCTION get_secret(secret_name TEXT)
RETURNS TEXT AS $$
DECLARE
  secret_value TEXT;
BEGIN
  SELECT value INTO secret_value
  FROM vault.decrypted_secrets
  WHERE name = secret_name
  LIMIT 1;
  RETURN secret_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

Ensure this function exists in your Supabase SQL editor or adjust the secret retrieval.
If you directly query `vault.decrypted_secrets`, ensure the Edge Function's database role has permission.
The service_role_key generally bypasses RLS but explicit grants might be needed depending on setup.
*/
