import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the user from the auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { amount_kobo, bank_name, account_number, account_name } = await req.json();

    // Validate input
    if (!amount_kobo || !bank_name || !account_number || !account_name) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for pending withdrawal requests (prevent multiple pending)
    const { data: pendingRequests } = await supabase
      .from("withdrawal_requests")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "pending");

    if (pendingRequests && pendingRequests.length > 0) {
      return new Response(JSON.stringify({ 
        error: "You have a pending withdrawal request. Please wait for it to be processed." 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use atomic RPC function to prevent double-spending
    const { data: result, error: rpcError } = await supabase.rpc("process_withdrawal", {
      p_user_id: user.id,
      p_amount_kobo: amount_kobo,
      p_bank_name: bank_name,
      p_account_number: account_number,
      p_account_name: account_name,
    });

    if (rpcError) {
      console.error("RPC error:", rpcError);
      return new Response(JSON.stringify({ error: "Failed to process withdrawal" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if the RPC returned an error
    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update profile with bank details for future use
    await supabase
      .from("profiles")
      .update({
        bank_name,
        account_number,
        account_name,
      })
      .eq("id", user.id);

    console.log(`Withdrawal request created: ${result.request_id} for user ${user.id}, amount: ${amount_kobo}`);

    return new Response(JSON.stringify({ 
      success: true,
      message: "Your withdrawal request has been submitted. Expect funds within 24 hours.",
      request_id: result.request_id,
      new_balance: result.new_balance,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Manual withdraw error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
