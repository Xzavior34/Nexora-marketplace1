// Squad Account Lookup. Verify worker bank details live before payout.
// Structured logs + client-safe error codes; never returns 500 to the browser.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SQUAD_BASE = (Deno.env.get('SQUAD_ENV') ?? 'sandbox') === 'live'
  ? 'https://api-d.squadco.com'
  : 'https://sandbox-api-d.squadco.com';

const rid = () => crypto.randomUUID().slice(0, 8);
const log = (req_id: string, code: string, msg: string, extra: Record<string, unknown> = {}) =>
  console.log(JSON.stringify({ fn: 'squad-account-lookup', req_id, code, msg, ...extra }));

const respond = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const req_id = rid();
  try {
    const body = await req.json().catch(() => ({}));
    const { bank_code, account_number } = body ?? {};
    if (!bank_code || !account_number) {
      log(req_id, 'BAD_INPUT', 'missing bank_code or account_number');
      return respond(400, { error: 'bank_code & account_number required', error_code: 'BAD_INPUT', req_id });
    }
    const secret = Deno.env.get('SQUAD_SECRET_KEY');
    if (!secret) {
      log(req_id, 'NO_SQUAD_KEY', 'SQUAD_SECRET_KEY missing');
      return respond(503, { error: 'Squad credentials not configured', error_code: 'NO_SQUAD_KEY', req_id });
    }
    const res = await fetch(`${SQUAD_BASE}/payout/account/lookup`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bank_code, account_number }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      log(req_id, 'SQUAD_ERROR', 'squad returned non-2xx', { status: res.status });
      return respond(502, { ...data, error_code: 'SQUAD_ERROR', upstream_status: res.status, req_id });
    }
    log(req_id, 'OK', 'lookup success');
    return respond(200, { ...data, req_id });
  } catch (e) {
    log(req_id, 'EXCEPTION', 'unhandled', { err: (e as Error).message });
    return respond(502, { error: 'Lookup failed', error_code: 'EXCEPTION', req_id });
  }
});
