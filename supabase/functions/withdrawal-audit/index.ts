// AI Withdrawal Auditor — inspects a user's transactional behavior, risk signals,
// and verification status, returning a structured fraud-audit verdict.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { audit_user_id } = await req.json();
    if (!audit_user_id || typeof audit_user_id !== "string") {
      return new Response(JSON.stringify({ error: "audit_user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const adminEmail = (user.email ?? "").toLowerCase();
    const { data: callerProfile } = await supabase
      .from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
    if (adminEmail !== "unigig60@gmail.com" && !callerProfile?.is_admin) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pull recent signals
    const [profileRes, txRes, disputesRes, escrowRes, withdrawalsRes] = await Promise.all([
      supabase.from("profiles")
        .select("id, full_name, email, is_verified, completed_gigs, average_rating, wallet_balance, vault_balance, created_at")
        .eq("id", audit_user_id).maybeSingle(),
      supabase.from("wallet_transactions")
        .select("type, amount_kobo, status, description, created_at")
        .eq("user_id", audit_user_id).order("created_at", { ascending: false }).limit(30),
      supabase.from("disputes")
        .select("type, status, created_at")
        .or(`reporter_id.eq.${audit_user_id},reported_id.eq.${audit_user_id}`)
        .order("created_at", { ascending: false }).limit(10),
      supabase.from("escrow_transactions")
        .select("status, amount_kobo, created_at")
        .or(`payer_id.eq.${audit_user_id},payee_id.eq.${audit_user_id}`)
        .order("created_at", { ascending: false }).limit(20),
      supabase.from("withdrawal_requests")
        .select("status, amount_kobo, created_at")
        .eq("user_id", audit_user_id).order("created_at", { ascending: false }).limit(10),
    ]);

    const profile = profileRes.data;
    if (!profile) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Quick deterministic signals
    const signals = {
      verified: !!profile.is_verified,
      completed_gigs: profile.completed_gigs ?? 0,
      avg_rating: Number(profile.average_rating ?? 0),
      account_age_days: Math.floor(
        (Date.now() - new Date(profile.created_at).getTime()) / 86_400_000,
      ),
      disputes_against: disputesRes.data?.filter((d: any) => d.status !== "resolved").length ?? 0,
      released_escrows: escrowRes.data?.filter((e: any) => e.status === "released").length ?? 0,
      rejected_withdrawals: withdrawalsRes.data?.filter((w: any) => w.status === "rejected").length ?? 0,
      recent_tx_count: txRes.data?.length ?? 0,
    };

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      // Deterministic fallback
      const passed =
        signals.disputes_against === 0 &&
        signals.rejected_withdrawals === 0 &&
        signals.account_age_days >= 3 &&
        (signals.verified || signals.completed_gigs >= 1);
      return new Response(JSON.stringify({
        verdict: passed ? "pass" : "alert",
        label: passed ? "🟢 AI Passed: Clean escrow history" : "🔴 Alert: Flagged account activity",
        confidence: 70,
        signals,
        reasoning: passed
          ? "No disputes, no rejected withdrawals, and a verified account with healthy escrow activity."
          : "Account shows risk factors: open disputes, prior rejected withdrawals, or unverified new account.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const system = `You are the Nexora AI Withdrawal Auditor. Your role is to assess fraud and money-laundering risk for a manual payout request from a Nigerian fintech marketplace.

Given the user signals, produce a strict JSON verdict via the report_audit tool.
- verdict: "pass" or "alert".
- label: short pill text. If pass, exactly "🟢 AI Passed: Clean escrow history". If alert, exactly "🔴 Alert: Flagged account activity".
- confidence: 0-100.
- reasoning: 1-2 sentences explaining the call to the human admin.

Heuristics: open disputes, rejected withdrawals, brand-new accounts (<3 days), or unverified accounts without completed gigs should alert. Strong verified history with released escrows should pass.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: `Signals:\n${JSON.stringify(signals, null, 2)}\n\nProfile: ${profile.full_name ?? "Unknown"} (${profile.email ?? "no email"})\nReturn ONLY the tool call.` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "report_audit",
            description: "Report the fraud audit verdict",
            parameters: {
              type: "object",
              properties: {
                verdict: { type: "string", enum: ["pass", "alert"] },
                label: { type: "string" },
                confidence: { type: "integer" },
                reasoning: { type: "string" },
              },
              required: ["verdict", "label", "confidence", "reasoning"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "report_audit" } },
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      return new Response(JSON.stringify({ error: "AI failed", detail: text }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const aiJson = await aiRes.json();
    const call = aiJson?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    let parsed: any = {};
    try { parsed = typeof call === "string" ? JSON.parse(call) : call; } catch { parsed = {}; }

    return new Response(JSON.stringify({
      verdict: parsed.verdict ?? "alert",
      label: parsed.label ?? "🔴 Alert: Insufficient data",
      confidence: Number(parsed.confidence) || 50,
      reasoning: parsed.reasoning ?? "",
      signals,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
