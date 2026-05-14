// Squad Banks list — structured logs, client-safe error codes. Never returns 500.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SQUAD_BASE = (Deno.env.get("SQUAD_ENV") ?? "sandbox") === "live"
  ? "https://api-d.squadco.com"
  : "https://sandbox-api-d.squadco.com";

const rid = () => crypto.randomUUID().slice(0, 8);
const log = (req_id: string, code: string, msg: string, extra: Record<string, unknown> = {}) =>
  console.log(JSON.stringify({ fn: "squad-banks", req_id, code, msg, ...extra }));

const respond = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const req_id = rid();
  try {
    const secret = Deno.env.get("SQUAD_SECRET_KEY");
    if (!secret) {
      log(req_id, "NO_SQUAD_KEY", "SQUAD_SECRET_KEY missing");
      return respond(503, { error: "Squad credentials not configured", error_code: "NO_SQUAD_KEY", req_id });
    }

    const res = await fetch(`${SQUAD_BASE}/payout/banks`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.data) {
      log(req_id, "SQUAD_ERROR", "non-2xx", { status: res.status });
      return respond(502, { error: "Failed to fetch banks", error_code: "SQUAD_ERROR", upstream_status: res.status, req_id });
    }
    const banks = data.data.map((b: any) => ({
      name: b.bank_name || b.name,
      code: b.bank_code || b.code,
    }));
    log(req_id, "OK", "fetched banks", { count: banks.length });
    return respond(200, { success: true, banks, req_id });
  } catch (e) {
    log(req_id, "EXCEPTION", "unhandled", { err: (e as Error).message });
    return respond(502, { error: "Bank list failed", error_code: "EXCEPTION", req_id });
  }
});
