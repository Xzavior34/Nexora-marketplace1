import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAILS = ["inemesitumoh41@gmail.com", "unigig60@gmail.com"];

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

    // Check if user is admin
    if (!user.email || !ADMIN_EMAILS.includes(user.email)) {
      return new Response(JSON.stringify({ error: "Unauthorized. Admin access required." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminEmail = user.email;

    const { request_id, action, admin_notes } = await req.json();

    if (!request_id || !action) {
      return new Response(JSON.stringify({ error: "Missing request_id or action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["approve", "reject"].includes(action)) {
      return new Response(JSON.stringify({ error: "Invalid action. Use 'approve' or 'reject'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the withdrawal request
    const { data: request, error: requestError } = await supabase
      .from("withdrawal_requests")
      .select("*")
      .eq("id", request_id)
      .single();

    if (requestError || !request) {
      return new Response(JSON.stringify({ error: "Withdrawal request not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (request.status !== "pending") {
      return new Response(JSON.stringify({ error: "Request already processed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user profile for email
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", request.user_id)
      .single();

    if (action === "approve") {
      // Mark as completed
      const { error: updateError } = await supabase
        .from("withdrawal_requests")
        .update({
          status: "completed",
          admin_notes: admin_notes || "Payment sent manually",
          processed_at: new Date().toISOString(),
          processed_by: adminEmail,
        })
        .eq("id", request_id);

      if (updateError) {
        console.error("Update error:", updateError);
        return new Response(JSON.stringify({ error: "Failed to update request" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Send notification to user
      await supabase.from("notifications").insert({
        user_id: request.user_id,
        title: "Withdrawal Successful",
        body: `Your withdrawal of ₦${(request.amount_kobo / 100).toLocaleString()} has been processed and sent to your ${request.bank_name} account.`,
        data: { type: "withdrawal_completed", request_id },
      });

      // Send email notification
      if (profile?.email) {
        try {
          await supabase.functions.invoke("send-withdrawal-email", {
            body: {
              email: profile.email,
              name: profile.full_name,
              amount: request.amount_kobo / 100,
              status: "approved",
              bankName: request.bank_name,
              accountNumber: request.account_number,
            },
          });
          console.log(`Approval email sent to ${profile.email}`);
        } catch (emailErr) {
          console.error("Failed to send approval email:", emailErr);
        }
      }

      console.log(`Withdrawal ${request_id} approved by ${adminEmail}`);

      return new Response(JSON.stringify({ 
        success: true,
        message: "Withdrawal approved and marked as completed",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else {
      // Use atomic refund RPC function
      const { data: refundResult, error: refundError } = await supabase.rpc("refund_withdrawal", {
        p_request_id: request_id,
        p_admin_notes: admin_notes || "Rejected by admin",
      });

      if (refundError) {
        console.error("Refund RPC error:", refundError);
        return new Response(JSON.stringify({ error: "Failed to process refund" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!refundResult.success) {
        return new Response(JSON.stringify({ error: refundResult.error }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Send notification to user
      await supabase.from("notifications").insert({
        user_id: request.user_id,
        title: "Withdrawal Rejected",
        body: `Your withdrawal request of ₦${(request.amount_kobo / 100).toLocaleString()} was rejected. ${admin_notes || "The funds have been refunded to your wallet."}`,
        data: { type: "withdrawal_rejected", request_id },
      });

      // Send email notification
      if (profile?.email) {
        try {
          await supabase.functions.invoke("send-withdrawal-email", {
            body: {
              email: profile.email,
              name: profile.full_name,
              amount: request.amount_kobo / 100,
              status: "rejected",
              reason: admin_notes || "Your withdrawal request was rejected. The funds have been returned to your wallet.",
            },
          });
          console.log(`Rejection email sent to ${profile.email}`);
        } catch (emailErr) {
          console.error("Failed to send rejection email:", emailErr);
        }
      }

      console.log(`Withdrawal ${request_id} rejected by ${adminEmail}, amount refunded: ${refundResult.refunded_amount}`);

      return new Response(JSON.stringify({ 
        success: true,
        message: "Withdrawal rejected and funds refunded to user",
        new_balance: refundResult.new_balance,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  } catch (error) {
    console.error("Admin process withdrawal error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
