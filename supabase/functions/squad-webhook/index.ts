// Squad webhook — confirms successful payments and credits wallet
// Validates HMAC signature header `x-squad-encrypted-body`
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-squad-encrypted-body",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SQUAD_SECRET_KEY = Deno.env.get("SQUAD_SECRET_KEY")!;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const rawBody = await req.text();
    const signature = req.headers.get("x-squad-encrypted-body") || "";

    // Verify HMAC SHA512
    const expected = createHmac("sha512", SQUAD_SECRET_KEY).update(rawBody).digest("hex").toUpperCase();
    if (signature && signature.toUpperCase() !== expected) {
      console.warn("Invalid Squad signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.parse(rawBody);
    console.log("Squad webhook:", JSON.stringify(payload));

    const event = payload?.Event || payload?.event;
    const body = payload?.Body || payload?.data || payload;
    const ref: string = body?.transaction_ref || body?.transactionRef || "";
    const status: string = (body?.transaction_status || body?.status || "").toLowerCase();
    const amount_kobo: number = Number(body?.transaction_amount ?? body?.amount ?? 0);

    if (!ref) {
      return new Response(JSON.stringify({ ok: true, ignored: "no ref" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Only process success events for our topups
    if (event === "charge_successful" || status === "success" || status === "successful") {
      const { data: topup } = await supabase
        .from("wallet_topups")
        .select("*")
        .eq("paystack_reference", ref)
        .maybeSingle();

      if (topup && topup.status !== "success") {
        // Apply 15% platform fee on deposits per project policy
        const gross = topup.amount_kobo || amount_kobo;
        const fee = Math.floor(gross * 0.15);
        const net = gross - fee;

        // Credit wallet via service role (bypasses guardian)
        const { data: profile } = await supabase
          .from("profiles").select("wallet_balance").eq("id", topup.user_id).single();
        const newBal = (profile?.wallet_balance || 0) + net;

        await supabase.from("profiles")
          .update({ wallet_balance: newBal, updated_at: new Date().toISOString() })
          .eq("id", topup.user_id);

        await supabase.from("wallet_transactions").insert({
          user_id: topup.user_id,
          type: "deposit",
          amount_kobo: net,
          balance_after_kobo: newBal,
          reference: ref,
          description: `Squad wallet topup (₦${(gross/100).toLocaleString()} gross, 15% fee)`,
          status: "success",
        });

        await supabase.from("wallet_topups").update({ status: "success" }).eq("id", topup.id);

        await supabase.from("admin_fees").insert({
          transaction_type: "deposit",
          source_user_id: topup.user_id,
          amount_kobo: fee,
          reference: ref,
          status: "collected",
        });
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("squad-webhook error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
