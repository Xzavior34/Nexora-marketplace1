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

    // Try /payout/banks first, fall back to /transaction/banks for older accounts.
    const tryFetch = async (path: string) => {
      const r = await fetch(`${SQUAD_BASE}${path}`, { headers: { Authorization: `Bearer ${secret}` } });
      const d = await r.json().catch(() => ({}));
      return { r, d, path };
    };
    let { r: res, d: data, path: usedPath } = await tryFetch("/payout/banks");
    if (!res.ok || !data?.data) {
      log(req_id, "FALLBACK", "primary path failed, trying fallback", { primary: "/payout/banks", primary_status: res.status, primary_msg: data?.message });
      const fb = await tryFetch("/transaction/banks");
      res = fb.r; data = fb.d; usedPath = fb.path;
    }
    if (!res.ok || !data?.data) {
      log(req_id, "SQUAD_ERROR", "all paths failed", { status: res.status, msg: data?.message, path: usedPath });
      return respond(502, { error: "Failed to fetch banks", error_code: "SQUAD_ERROR", upstream_status: res.status, upstream_message: data?.message, req_id });
    }
    const banks = data.data.map((b: { bank_name?: string; name?: string; bank_code?: string; code?: string }) => ({
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
