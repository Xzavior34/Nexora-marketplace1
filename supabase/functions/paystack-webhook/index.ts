import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!PAYSTACK_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Server configuration error");
    }

    const body = await req.text();

    // Verify Paystack signature (HMAC-SHA512 of raw body with secret key)
    const received = req.headers.get("x-paystack-signature");
    if (!received) {
      console.warn("Missing x-paystack-signature header");
      return new Response("Forbidden", { status: 403, headers: corsHeaders });
    }
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(PAYSTACK_SECRET_KEY),
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign"],
    );
    const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
    const expected = Array.from(new Uint8Array(sigBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    if (expected !== received) {
      console.warn("Invalid Paystack signature");
      return new Response("Forbidden", { status: 403, headers: corsHeaders });
    }

    const event = JSON.parse(body);
    console.log("Webhook event received:", event.event);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Handle charge.success (deposits and escrow funding)
    if (event.event === "charge.success") {
      const { reference, amount, metadata } = event.data;
      console.log(`Payment successful for reference: ${reference}, amount: ${amount}`);

      // 1) Wallet topups
      const { data: topup } = await supabase
        .from("wallet_topups")
        .select("*")
        .eq("paystack_reference", reference)
        .maybeSingle();

      if (topup) {
        if (topup.status !== "success") {
          const { data: profile } = await supabase
            .from("profiles")
            .select("wallet_balance")
            .eq("id", topup.user_id)
            .single();

          const currentBalance = profile?.wallet_balance ?? 0;
          
          // NO fee on deposits - full amount goes to wallet
          const newBalance = currentBalance + topup.amount_kobo;

          // Update user wallet with full amount
          await supabase
            .from("profiles")
            .update({ wallet_balance: newBalance })
            .eq("id", topup.user_id);

          // Record wallet transaction
          await supabase
            .from("wallet_transactions")
            .insert({
              user_id: topup.user_id,
              type: "deposit",
              amount_kobo: topup.amount_kobo,
              balance_after_kobo: newBalance,
              reference,
              description: `Wallet deposit ₦${(topup.amount_kobo / 100).toLocaleString()}`,
            });

          // Mark topup as success
          await supabase
            .from("wallet_topups")
            .update({ status: "success" })
            .eq("id", topup.id);

          console.log(`Wallet topup ${topup.id} marked as success. Amount: ₦${topup.amount_kobo / 100}`);
        }

        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 2) Escrow funding
      const { data: escrow } = await supabase
        .from("escrow_transactions")
        .select("*")
        .eq("paystack_reference", reference)
        .single();

      if (escrow) {
        await supabase.from("escrow_transactions").update({ status: "held" }).eq("id", escrow.id);
        await supabase.from("tasks").update({ status: "assigned", assignee_id: escrow.payee_id }).eq("id", escrow.task_id);
        console.log(`Escrow ${escrow.id} marked as held`);
      }
    }

    // Handle transfer.success (withdrawal completed successfully)
    if (event.event === "transfer.success") {
      const { reference, amount, recipient } = event.data;
      console.log(`Transfer successful for reference: ${reference}, amount: ${amount}`);

      // Find the withdrawal request by matching the amount and status
      const { data: withdrawal } = await supabase
        .from("withdrawal_requests")
        .select("*, profiles!withdrawal_requests_user_id_fkey(email, full_name)")
        .eq("status", "pending")
        .eq("amount_kobo", amount)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (withdrawal) {
        // Update withdrawal request to completed
        await supabase
          .from("withdrawal_requests")
          .update({
            status: "completed",
            admin_notes: "Auto-processed via Paystack transfer",
            processed_at: new Date().toISOString(),
          })
          .eq("id", withdrawal.id);

        // Send notification
        await supabase.from("notifications").insert({
          user_id: withdrawal.user_id,
          title: "Withdrawal Successful",
          body: `Your withdrawal of ₦${(withdrawal.amount_kobo / 100).toLocaleString()} has been sent to your ${withdrawal.bank_name} account.`,
          data: { type: "withdrawal_completed", request_id: withdrawal.id },
        });

        // Send email notification
        try {
          const profile = withdrawal.profiles;
          await fetch(`${SUPABASE_URL}/functions/v1/send-withdrawal-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              email: profile?.email,
              name: profile?.full_name,
              amount: withdrawal.amount_kobo / 100,
              status: "approved",
              bankName: withdrawal.bank_name,
              accountNumber: withdrawal.account_number,
            }),
          });
          console.log(`Withdrawal success email sent to ${profile?.email}`);
        } catch (emailErr) {
          console.error("Failed to send success email:", emailErr);
        }

        console.log(`Withdrawal ${withdrawal.id} marked as completed via webhook`);
      }
    }

    // Handle transfer.failed (withdrawal failed - auto refund)
    if (event.event === "transfer.failed") {
      const { reference, amount, reason } = event.data;
      console.log(`Transfer failed for reference: ${reference}, amount: ${amount}, reason: ${reason}`);

      // Find the pending withdrawal request
      const { data: withdrawal } = await supabase
        .from("withdrawal_requests")
        .select("*, profiles!withdrawal_requests_user_id_fkey(email, full_name, wallet_balance)")
        .eq("status", "pending")
        .eq("amount_kobo", amount)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (withdrawal) {
        // Use the atomic refund function
        const { data: refundResult, error: refundError } = await supabase.rpc("refund_withdrawal", {
          p_request_id: withdrawal.id,
          p_admin_notes: `Auto-refunded: ${reason || "Bank transfer failed"}`,
        });

        if (refundError) {
          console.error("Refund RPC error:", refundError);
        } else {
          console.log(`Withdrawal ${withdrawal.id} refunded due to transfer failure. New balance: ${refundResult?.new_balance}`);

          // Send notification
          await supabase.from("notifications").insert({
            user_id: withdrawal.user_id,
            title: "Withdrawal Failed - Refunded",
            body: `Your withdrawal of ₦${(withdrawal.amount_kobo / 100).toLocaleString()} failed and has been refunded to your wallet. Reason: ${reason || "Bank transfer failed"}`,
            data: { type: "withdrawal_failed", request_id: withdrawal.id },
          });

          // Send email notification
          try {
            const profile = withdrawal.profiles;
            await fetch(`${SUPABASE_URL}/functions/v1/send-withdrawal-email`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              },
              body: JSON.stringify({
                email: profile?.email,
                name: profile?.full_name,
                amount: withdrawal.amount_kobo / 100,
                status: "rejected",
                reason: reason || "Bank transfer failed. The funds have been returned to your wallet.",
              }),
            });
            console.log(`Withdrawal failure email sent to ${profile?.email}`);
          } catch (emailErr) {
            console.error("Failed to send failure email:", emailErr);
          }
        }
      }
    }

    // Handle transfer.reversed (withdrawal reversed - auto refund)
    if (event.event === "transfer.reversed") {
      const { reference, amount, reason } = event.data;
      console.log(`Transfer reversed for reference: ${reference}, amount: ${amount}`);

      // Similar handling as transfer.failed
      const { data: withdrawal } = await supabase
        .from("withdrawal_requests")
        .select("*, profiles!withdrawal_requests_user_id_fkey(email, full_name)")
        .eq("status", "completed")
        .eq("amount_kobo", amount)
        .order("processed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (withdrawal) {
        const { data: refundResult } = await supabase.rpc("refund_withdrawal", {
          p_request_id: withdrawal.id,
          p_admin_notes: `Transfer reversed: ${reason || "Bank returned the transfer"}`,
        });

        if (refundResult?.success) {
          await supabase.from("notifications").insert({
            user_id: withdrawal.user_id,
            title: "Transfer Reversed - Refunded",
            body: `Your withdrawal of ₦${(withdrawal.amount_kobo / 100).toLocaleString()} was reversed by the bank and refunded to your wallet.`,
            data: { type: "withdrawal_reversed", request_id: withdrawal.id },
          });
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    const error = err as Error;
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
