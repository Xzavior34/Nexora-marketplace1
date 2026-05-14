// Squad Release Escrow — atomic state transitions via release_escrow_atomic RPC.
// Strict guard: held -> released | refunded. Wallet credited EXACTLY ONCE.
// Structured logs + client-safe error codes. Never returns 500.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const rid = () => crypto.randomUUID().slice(0, 8);
const log = (req_id: string, code: string, msg: string, extra: Record<string, unknown> = {}) =>
  console.log(JSON.stringify({ fn: "squad-release-escrow", req_id, code, msg, ...extra }));

const respond = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const req_id = rid();

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!SUPABASE_URL || !SERVICE_KEY) {
      log(req_id, "NO_CONFIG", "missing supabase env");
      return respond(503, { error: "Server not configured", error_code: "NO_CONFIG", req_id });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      log(req_id, "UNAUTHENTICATED", "no auth header");
      return respond(401, { error: "Unauthorized", error_code: "UNAUTHENTICATED", req_id });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      log(req_id, "UNAUTHENTICATED", "invalid token");
      return respond(401, { error: "Unauthorized", error_code: "UNAUTHENTICATED", req_id });
    }

    const body = await req.json().catch(() => ({}));
    const escrowId: string | undefined = body.escrowId;
    const action: "release" | "decline" = body.action ?? "release";
    if (!escrowId) {
      log(req_id, "BAD_INPUT", "escrowId required");
      return respond(400, { error: "escrowId required", error_code: "BAD_INPUT", req_id });
    }

    const rpcAction = action === "decline" ? "refund" : "release";
    log(req_id, "ATTEMPT", "calling release_escrow_atomic", { escrowId, rpcAction, caller: user.id });

    const { data, error } = await supabase.rpc("release_escrow_atomic", {
      p_escrow_id: escrowId,
      p_action: rpcAction,
      p_caller: user.id,
    });

    if (error) {
      log(req_id, "RPC_ERROR", "release_escrow_atomic failed", { msg: error.message });
      return respond(502, { error: "Escrow action failed", error_code: "RPC_ERROR", req_id });
    }

    const result = data as { success?: boolean; error?: string; error_code?: string };
    if (!result?.success) {
      log(req_id, result?.error_code ?? "INVALID_STATE", "guard rejected", { result });
      return respond(409, { ...result, req_id });
    }

    log(req_id, "OK", "escrow transitioned", { escrowId, rpcAction });

    // Fire-and-forget side-effects (notification + email). Failures must not roll back.
    try {
      if (rpcAction === "release") {
        const { data: esc } = await supabase
          .from("escrow_transactions").select("payee_id, task_id, amount_kobo").eq("id", escrowId).single();
        if (esc) {
          await supabase.from("notifications").insert({
            user_id: esc.payee_id,
            title: "Payment Received!",
            body: `You've received ₦${(esc.amount_kobo / 100).toLocaleString()} for completing a gig.`,
            data: { taskId: esc.task_id },
          });
        }
      }
    } catch (sideErr) {
      log(req_id, "SIDE_EFFECT_WARN", "non-blocking notification failure", { err: (sideErr as Error).message });
    }

    return respond(200, { ...result, req_id });
  } catch (e) {
    log(req_id, "EXCEPTION", "unhandled", { err: (e as Error).message });
    return respond(502, { error: "Escrow action failed", error_code: "EXCEPTION", req_id });
  }
});
