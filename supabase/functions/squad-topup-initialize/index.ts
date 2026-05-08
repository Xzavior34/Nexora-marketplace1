// Squad payment initialization for wallet topups
// Docs: https://squadinc.gitbook.io/squad-api-documentation/payments/initiate-payment
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Toggle live vs sandbox via SQUAD_ENV secret ("live" | "sandbox"). Defaults to sandbox.
const SQUAD_ENV = (Deno.env.get("SQUAD_ENV") || "sandbox").toLowerCase();
const SQUAD_BASE = SQUAD_ENV === "live"
  ? "https://api-d.squadco.com"
  : "https://sandbox-api-d.squadco.com";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SQUAD_SECRET_KEY = Deno.env.get("SQUAD_SECRET_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SQUAD_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Server configuration error");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { amount_kobo } = await req.json();
    if (!Number.isFinite(amount_kobo) || amount_kobo < 10000) {
      return new Response(JSON.stringify({ error: "Minimum deposit is ₦100" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const transaction_ref = `SQUAD_TOPUP_${user.id}_${Date.now()}`;
    const origin = req.headers.get("origin") || "https://unigig.site";

    // Initiate Squad transaction
    const initRes = await fetch(`${SQUAD_BASE}/transaction/initiate`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SQUAD_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amount_kobo,
        email: user.email,
        currency: "NGN",
        initiate_type: "inline",
        transaction_ref,
        callback_url: `${origin}/payment/callback`,
        customer_name: user.user_metadata?.full_name || "UniGig User",
      }),
    });

    const initData = await initRes.json();
    console.log("Squad init response:", JSON.stringify(initData));

    if (!initData?.status || !initData?.data?.checkout_url) {
      return new Response(JSON.stringify({ error: initData?.message || "Squad init failed" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Record pending topup (use existing wallet_topups table)
    await supabase.from("wallet_topups").insert({
      user_id: user.id,
      amount_kobo,
      paystack_reference: transaction_ref, // reuse column for ref tracking
      status: "pending",
    });

    return new Response(JSON.stringify({
      success: true,
      authorization_url: initData.data.checkout_url,
      reference: transaction_ref,
      provider: "squad",
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("squad-topup-initialize error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
