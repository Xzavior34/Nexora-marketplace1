// Squad Health — structured aggregate health-check across all Squad endpoints.
// Returns 200 with { ok, components[] } even when sub-checks fail, so monitors
// can alert on individual component status without retrying the wrapper.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SQUAD_ENV = Deno.env.get("SQUAD_ENV") ?? "sandbox";
const SQUAD_BASE = SQUAD_ENV === "live"
  ? "https://api-d.squadco.com"
  : "https://sandbox-api-d.squadco.com";

const rid = () => crypto.randomUUID().slice(0, 8);
const log = (req_id: string, code: string, msg: string, extra: Record<string, unknown> = {}) =>
  console.log(JSON.stringify({ fn: "squad-health", req_id, code, msg, ...extra }));

type Component = {
  name: string;
  ok: boolean;
  status?: number;
  error_code?: string;
  latency_ms?: number;
};

async function check(name: string, run: () => Promise<Response>): Promise<Component> {
  const t0 = Date.now();
  try {
    const r = await run();
    return { name, ok: r.ok, status: r.status, latency_ms: Date.now() - t0 };
  } catch (e) {
    return { name, ok: false, error_code: "FETCH_FAIL", latency_ms: Date.now() - t0 };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const req_id = rid();

  const secret = Deno.env.get("SQUAD_SECRET_KEY");
  const checks: Component[] = [];

  checks.push({
    name: "squad_secret",
    ok: !!secret,
    error_code: secret ? undefined : "NO_SQUAD_KEY",
  });

  if (secret) {
    checks.push(await check("squad_banks_api", () =>
      fetch(`${SQUAD_BASE}/payout/banks`, { headers: { Authorization: `Bearer ${secret}` } })
    ));
  }

  const ok = checks.every((c) => c.ok);
  const failing = checks.filter((c) => !c.ok).map((c) => c.name);

  // ALERT log line — log aggregators (Datadog/Logflare) can pattern-match on "code":"ALERT"
  if (!ok) log(req_id, "ALERT", "squad health degraded", { failing, env: SQUAD_ENV });
  else log(req_id, "OK", "squad health green", { env: SQUAD_ENV });

  return new Response(
    JSON.stringify({ ok, env: SQUAD_ENV, components: checks, req_id, ts: new Date().toISOString() }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
