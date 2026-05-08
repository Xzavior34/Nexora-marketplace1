import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InitializeRequest {
  taskId: string;
  assigneeId: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!PAYSTACK_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing environment variables");
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
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { taskId, assigneeId }: InitializeRequest = await req.json();
    console.log(`Initializing payment for task: ${taskId}, assignee: ${assigneeId}`);

    // Get task details
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      console.error("Task error:", taskError);
      return new Response(JSON.stringify({ error: "Task not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is the task poster
    if (task.poster_id !== user.id) {
      return new Response(JSON.stringify({ error: "Only task poster can initiate payment" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get payer profile
    const { data: payerProfile, error: payerError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", user.id)
      .single();

    if (payerError || !payerProfile) {
      console.error("Payer profile error:", payerError);
      return new Response(JSON.stringify({ error: "Payer profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate platform fee (20%)
    const platformFee = Math.floor(task.price_kobo * 0.2);
    const reference = `UNIGIGS_${taskId}_${Date.now()}`;

    // Create escrow record
    const { data: escrow, error: escrowError } = await supabase
      .from("escrow_transactions")
      .insert({
        task_id: taskId,
        payer_id: user.id,
        payee_id: assigneeId,
        amount_kobo: task.price_kobo,
        platform_fee_kobo: platformFee,
        paystack_reference: reference,
        status: "pending",
      })
      .select()
      .single();

    if (escrowError) {
      console.error("Escrow creation error:", escrowError);
      return new Response(JSON.stringify({ error: "Failed to create escrow" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Paystack transaction
    const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: payerProfile.email,
        amount: task.price_kobo, // Paystack expects amount in Kobo
        reference: reference,
        callback_url: `${req.headers.get("origin")}/payment/callback`,
        metadata: {
          escrow_id: escrow.id,
          task_id: taskId,
          payer_id: user.id,
          payee_id: assigneeId,
          custom_fields: [
            {
              display_name: "Task",
              variable_name: "task_title",
              value: task.title,
            },
          ],
        },
      }),
    });

    const paystackData = await paystackResponse.json();
    console.log("Paystack response:", paystackData);

    if (!paystackData.status) {
      console.error("Paystack error:", paystackData);
      return new Response(JSON.stringify({ error: paystackData.message || "Payment initialization failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      authorization_url: paystackData.data.authorization_url,
      access_code: paystackData.data.access_code,
      reference: paystackData.data.reference,
      escrow_id: escrow.id,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    const error = err as Error;
    console.error("Error in paystack-initialize:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
