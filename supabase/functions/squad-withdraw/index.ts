import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WithdrawRequest {
  amount_kobo: number;
}

// Toggle live vs sandbox via SQUAD_ENV secret ("live" | "sandbox"). Defaults to sandbox.
const SQUAD_ENV = (Deno.env.get("SQUAD_ENV") || "sandbox").toLowerCase();
const SQUAD_BASE = SQUAD_ENV === "live"
  ? "https://api-d.squadco.com"
  : "https://sandbox-api-d.squadco.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { amount_kobo }: WithdrawRequest = await req.json();
    console.log(`Squad Withdrawal request: ${amount_kobo} kobo for user ${user.id}`);

    // Minimum withdrawal is ₦100 (10000 kobo)
    if (amount_kobo < 10000) {
      return new Response(JSON.stringify({ error: "Minimum withdrawal is ₦100" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("Profile error:", profileError);
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check sufficient balance
    if (profile.wallet_balance < amount_kobo) {
      return new Response(JSON.stringify({ error: "Insufficient balance" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if bank details exist
    if (!profile.account_number || !profile.bank_name) {
      return new Response(JSON.stringify({ error: "Please add your bank details first" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch banks to get bank code
    const banksResponse = await fetch(`${SQUAD_BASE}/payout/banks`, {
      headers: { "Authorization": `Bearer ${SQUAD_SECRET_KEY}` },
    });
    const banksData = await banksResponse.json();
    
    const bank = banksData.data?.find((b: { bank_name?: string; bank_code?: string; name?: string }) => 
      b.bank_name?.toLowerCase().includes(profile.bank_name.toLowerCase()) ||
      profile.bank_name.toLowerCase().includes(b.bank_name?.toLowerCase())
    );

    if (!bank) {
      return new Response(JSON.stringify({ error: "Bank configuration not found. Please re-select your bank." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate 10% platform fee on withdrawal
    const platformFee = Math.floor(amount_kobo * 0.10);
    const userReceives = amount_kobo - platformFee;

    // Deduct full amount from wallet
    const newBalance = profile.wallet_balance - amount_kobo;
    
    const { error: balanceError } = await supabase
      .from("profiles")
      .update({ wallet_balance: newBalance })
      .eq("id", user.id);

    if (balanceError) {
      console.error("Balance update error:", balanceError);
      return new Response(JSON.stringify({ error: "Failed to update balance" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reference = `WITHDRAW_${user.id}_${Date.now()}`;

    // Create wallet transaction for user withdrawal
    await supabase.from("wallet_transactions").insert({
      user_id: user.id,
      type: "withdrawal",
      amount_kobo: amount_kobo,
      balance_after_kobo: newBalance,
      reference: reference,
      description: `Withdrawal to ${profile.bank_name} - ${profile.account_number} (10% fee: ₦${platformFee / 100})`,
    });

    // Log the 10% platform fee for admin OPay account 9064513390
    await supabase.from("admin_fees").insert({
      transaction_type: "withdrawal",
      source_user_id: user.id,
      amount_kobo: platformFee,
      reference: reference,
      admin_account: "9064513390",
      status: "pending",
    });

    console.log(`Platform fee of ₦${platformFee / 100} logged for admin OPay 9064513390`);

    // Initiate Squad transfer payout
    const transferResponse = await fetch(`${SQUAD_BASE}/payout/transfer`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SQUAD_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transaction_reference: reference,
        amount: String(userReceives), // net amount
        bank_code: bank.bank_code,
        account_number: profile.account_number,
        account_name: profile.account_name || profile.full_name,
        currency_id: "NGN",
        remark: "Nexora Withdrawal",
      }),
    });

    const transferData = await transferResponse.json();
    console.log("Squad Transfer response:", JSON.stringify(transferData));

    if (!transferResponse.ok || !transferData.status) {
      // Refund on failure
      await supabase
        .from("profiles")
        .update({ wallet_balance: profile.wallet_balance })
        .eq("id", user.id);

      await supabase.from("wallet_transactions").insert({
        user_id: user.id,
        type: "refund",
        amount_kobo: amount_kobo,
        balance_after_kobo: profile.wallet_balance,
        reference: `REFUND_${reference}`,
        description: `Withdrawal failed: ${transferData.message || "Squad transfer refused"}`,
      });

      // Remove admin fee record on failure
      await supabase.from("admin_fees").delete().eq("reference", reference);

      return new Response(JSON.stringify({ error: transferData.message || "Squad transfer failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update admin fee status to completed
    await supabase.from("admin_fees").update({ status: "completed" }).eq("reference", reference);

    console.log(`Squad Withdrawal initiated: ${reference}, total: ₦${amount_kobo / 100}, user receives: ₦${userReceives / 100}`);

    // Send email notification for successful withdrawal
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/send-withdrawal-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          email: profile.email,
          name: profile.full_name || profile.account_name || "User",
          amount: userReceives / 100,
          status: "approved",
          bankName: profile.bank_name,
          accountNumber: profile.account_number,
        }),
      });
    } catch (emailErr) {
      console.error("Failed to send withdrawal email (non-blocking):", emailErr);
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Withdrawal initiated successfully via Squad",
      reference: reference,
      amount_kobo: amount_kobo,
      user_receives_kobo: userReceives,
      platform_fee_kobo: platformFee,
      new_balance_kobo: newBalance,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    const error = err as Error;
    console.error("Error in squad withdraw:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
