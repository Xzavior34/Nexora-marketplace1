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
    console.log(`Initializing payment for task: ${taskId}, assignee: ${assigneeId} via Squad`);

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

    const platformFee = 0;
    const reference = `SQUAD_ESCROW_${taskId}_${Date.now()}`;

    // Create escrow record
    const { data: escrow, error: escrowError } = await supabase
      .from("escrow_transactions")
      .insert({
        task_id: taskId,
        payer_id: user.id,
        payee_id: assigneeId,
        amount_kobo: task.price_kobo,
        platform_fee_kobo: platformFee,
        squad_reference: reference,
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

    const origin = req.headers.get("origin") || "https://unigig.site";

    // Initialize Squad transaction
    const squadResponse = await fetch(`${SQUAD_BASE}/transaction/initiate`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SQUAD_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: payerProfile.email,
        amount: task.price_kobo, // Squad expects amount in Kobo
        currency: "NGN",
        initiate_type: "inline",
        transaction_ref: reference,
        callback_url: `${origin}/payment/callback`,
        customer_name: payerProfile.full_name || "Nexora User",
      }),
    });

    const squadData = await squadResponse.json();
    console.log("Squad init response:", JSON.stringify(squadData));

    if (!squadData?.status || !squadData?.data?.checkout_url) {
      console.error("Squad error:", squadData);
      return new Response(JSON.stringify({ error: squadData?.message || "Payment initialization failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      authorization_url: squadData.data.checkout_url,
      reference: reference,
      escrow_id: escrow.id,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    const error = err as Error;
    console.error("Error in squad-initialize:", error);
    return new Response(JSON.stringify({ error: "Squad payment initialization failed", detail: error.message, error_code: "SQUAD_INIT_FAILED" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
