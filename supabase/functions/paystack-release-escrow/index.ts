import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReleaseRequest {
  escrowId: string;
  action: "release" | "decline";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Server configuration error");
    }

    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { escrowId, action = "release" }: ReleaseRequest = await req.json();
    console.log(`Escrow action: ${action} for ${escrowId}`);

    // Get escrow details
    const { data: escrow, error: escrowError } = await supabase
      .from("escrow_transactions")
      .select("*")
      .eq("id", escrowId)
      .single();

    if (escrowError || !escrow) {
      console.error("Escrow error:", escrowError);
      return new Response(JSON.stringify({ error: "Escrow not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only payer can release/decline escrow
    if (escrow.payer_id !== user.id) {
      return new Response(JSON.stringify({ error: "Only task poster can perform this action" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (escrow.status !== "held") {
      return new Response(JSON.stringify({ error: "Escrow is not in held status" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "release") {
      // NO FEE AT ESCROW RELEASE - Worker gets 100%
      // Fee is only taken during withdrawal
      const workerAmount = escrow.amount_kobo;

      // Get payee's current balance and stats
      const { data: payeeProfile, error: profileError } = await supabase
        .from("profiles")
        .select("wallet_balance, completed_gigs")
        .eq("id", escrow.payee_id)
        .single();

      if (profileError || !payeeProfile) {
        console.error("Payee profile error:", profileError);
        return new Response(JSON.stringify({ error: "Payee profile not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const newBalance = payeeProfile.wallet_balance + workerAmount;
      const completedGigs = (payeeProfile.completed_gigs || 0) + 1;

      // Update payee's wallet balance and completed gigs
      await supabase
        .from("profiles")
        .update({ wallet_balance: newBalance, completed_gigs: completedGigs })
        .eq("id", escrow.payee_id);

      // Update escrow status
      await supabase
        .from("escrow_transactions")
        .update({ 
          status: "released",
          released_at: new Date().toISOString()
        })
        .eq("id", escrowId);

      // Update task status to completed
      await supabase
        .from("tasks")
        .update({ status: "completed" })
        .eq("id", escrow.task_id);

      // Create wallet transaction for worker
      await supabase.from("wallet_transactions").insert({
        user_id: escrow.payee_id,
        type: "escrow_release",
        amount_kobo: workerAmount,
        balance_after_kobo: newBalance,
        reference: `RELEASE_${escrow.paystack_reference}`,
        description: "Payment received for completed task",
        escrow_id: escrowId,
      });

      // NO platform fee recorded here - fee is taken at withdrawal only

      // Send notification to worker
      await supabase.from("notifications").insert({
        user_id: escrow.payee_id,
        title: "Payment Received!",
        body: `You've received ₦${(workerAmount / 100).toLocaleString()} for completing a gig.`,
        data: { taskId: escrow.task_id },
      });

      // Get payee email for notification
      const { data: payeeEmail } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", escrow.payee_id)
        .single();

      // Get task title
      const { data: taskData } = await supabase
        .from("tasks")
        .select("title")
        .eq("id", escrow.task_id)
        .single();

      // Send email notification for payment received
      if (payeeEmail?.email) {
        try {
          const emailResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-payment-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              email: payeeEmail.email,
              name: payeeEmail.full_name || "User",
              amount: workerAmount / 100,
              taskTitle: taskData?.title,
              type: "escrow_release",
            }),
          });
          const emailData = await emailResponse.json();
          console.log("Payment email sent:", emailData);
        } catch (emailErr) {
          console.error("Failed to send payment email (non-blocking):", emailErr);
        }
      }

      console.log(`Escrow ${escrowId} released. Worker received ₦${workerAmount / 100}`);

      return new Response(JSON.stringify({
        success: true,
        action: "released",
        message: "Payment released successfully (100% to freelancer)",
        worker_amount_kobo: workerAmount,
        platform_fee_kobo: 0, // No fee at release
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "decline") {
      // Refund to client (payer)
      const { data: clientProfile, error: clientError } = await supabase
        .from("profiles")
        .select("wallet_balance")
        .eq("id", escrow.payer_id)
        .single();

      if (clientError || !clientProfile) {
        return new Response(JSON.stringify({ error: "Client profile not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const refundAmount = escrow.amount_kobo; // Full refund
      const newBalance = clientProfile.wallet_balance + refundAmount;

      // Update client wallet
      await supabase
        .from("profiles")
        .update({ wallet_balance: newBalance })
        .eq("id", escrow.payer_id);

      // Record refund transaction
      await supabase.from("wallet_transactions").insert({
        user_id: escrow.payer_id,
        type: "refund",
        amount_kobo: refundAmount,
        balance_after_kobo: newBalance,
        escrow_id: escrowId,
        description: "Gig refunded - work declined",
      });

      // Update escrow status
      await supabase
        .from("escrow_transactions")
        .update({ status: "refunded" })
        .eq("id", escrowId);

      // Update task status
      await supabase
        .from("tasks")
        .update({ status: "cancelled" })
        .eq("id", escrow.task_id);

      // Send notification to worker
      await supabase.from("notifications").insert({
        user_id: escrow.payee_id,
        title: "Work Declined",
        body: "The client has declined the work. The payment has been refunded.",
        data: { taskId: escrow.task_id },
      });

      console.log(`Escrow ${escrowId} refunded. Client received ₦${refundAmount / 100}`);

      return new Response(JSON.stringify({
        success: true,
        action: "refunded",
        message: "Payment refunded successfully",
        refund_amount_kobo: refundAmount,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    const error = err as Error;
    console.error("Error in release-escrow:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
