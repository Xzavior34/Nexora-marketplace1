const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

const FN = 'squad-account-lookup';
const TIMEOUT_MS = 8000;
const MAX_RETRIES = 2;

const rid = () => crypto.randomUUID().slice(0, 8);
const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const log = (req_id: string, level: 'info' | 'warn' | 'error', code: string, msg: string, extra: Record<string, unknown> = {}) =>
  console[level](JSON.stringify({ fn: FN, req_id, code, msg, ...extra, ts: new Date().toISOString() }));

const getBaseUrl = () => {
  const env = (Deno.env.get('SQUAD_ENV') || 'sandbox').toLowerCase();
  if (!['sandbox', 'live'].includes(env)) return null;
  return env === 'live' ? 'https://api-d.squadco.com' : 'https://sandbox-api-d.squadco.com';
};

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort('timeout'), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function callSquad(baseUrl: string, secret: string, payload: Record<string, string>, req_id: string) {
  const endpoints = ['/payout/account/lookup', '/payout/lookup/account'];
  let last: { status: number; data: Record<string, unknown>; endpoint: string } | null = null;

  for (const endpoint of endpoints) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const started = Date.now();
      try {
        const res = await fetchWithTimeout(`${baseUrl}${endpoint}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }, TIMEOUT_MS);
        const text = await res.text();
        let data: Record<string, unknown> = {};
        try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text.slice(0, 300) }; }
        last = { status: res.status, data, endpoint };
        log(req_id, res.ok ? 'info' : 'warn', res.ok ? 'UPSTREAM_OK' : 'UPSTREAM_ERROR', 'Squad lookup response', { status: res.status, endpoint, attempt, duration_ms: Date.now() - started });
        if (res.ok) return last;
        if (![408, 429, 500, 502, 503, 504].includes(res.status)) break;
      } catch (e) {
        last = { status: 504, data: { message: (e as Error).message }, endpoint };
        log(req_id, 'warn', 'UPSTREAM_TIMEOUT_OR_NETWORK', 'Squad lookup attempt failed', { endpoint, attempt, duration_ms: Date.now() - started, err: (e as Error).message });
      }
      if (attempt < MAX_RETRIES) await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }

  return last;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const req_id = req.headers.get('x-request-id') || rid();
  const started = Date.now();

  try {
    if (req.method !== 'POST') return json(405, { error: 'Method not allowed', error_code: 'METHOD_NOT_ALLOWED', req_id });

    const baseUrl = getBaseUrl();
    const secret = Deno.env.get('SQUAD_SECRET_KEY');
    if (!baseUrl) return json(503, { error: 'Invalid Squad environment', error_code: 'BAD_SQUAD_ENV', req_id });
    if (!secret) return json(503, { error: 'Squad credentials not configured', error_code: 'NO_SQUAD_KEY', req_id });

    const body = await req.json().catch(() => null) as { bank_code?: string; account_number?: string } | null;
    const bank_code = String(body?.bank_code || '').trim();
    const account_number = String(body?.account_number || '').trim();
    if (!/^\d{2,10}$/.test(bank_code) || !/^\d{10}$/.test(account_number)) {
      log(req_id, 'warn', 'BAD_INPUT', 'Invalid lookup payload');
      return json(400, { error: 'Valid bank code and 10-digit account number are required', error_code: 'BAD_INPUT', req_id });
    }

    const result = await callSquad(baseUrl, secret, { bank_code, account_number }, req_id);
    if (!result) return json(502, { error: 'Unable to reach Squad', error_code: 'UPSTREAM_UNAVAILABLE', req_id });
    if (result.status < 200 || result.status >= 300) {
      const message = String(result.data?.message || result.data?.error || 'Account lookup failed');
      const code = /not found|invalid|unable/i.test(message) ? 'ACCOUNT_NOT_FOUND' : 'SQUAD_ERROR';
      return json(result.status >= 500 ? 502 : 400, { error: message, error_code: code, upstream_status: result.status, req_id });
    }

    log(req_id, 'info', 'OK', 'Account lookup completed', { duration_ms: Date.now() - started });
    return json(200, { success: true, ...result.data, req_id });
  } catch (e) {
    log(req_id, 'error', 'EXCEPTION', 'Lookup crashed safely', { err: (e as Error).message, duration_ms: Date.now() - started });
    return json(502, { error: 'Bank verification is temporarily unavailable', error_code: 'EXCEPTION', req_id });
  }
});
