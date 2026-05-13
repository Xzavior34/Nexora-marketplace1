// Squad Virtual Account creation. Returns a persistent NUBAN for wallet funding.
// Structured logs + client-safe error codes; no leaking 500s.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SQUAD_BASE = (Deno.env.get('SQUAD_ENV') ?? 'sandbox') === 'live'
  ? 'https://api-d.squadco.com'
  : 'https://sandbox-api-d.squadco.com';

const rid = () => crypto.randomUUID().slice(0, 8);
const log = (req_id: string, code: string, msg: string, extra: Record<string, unknown> = {}) =>
  console.log(JSON.stringify({ fn: 'squad-virtual-account', req_id, code, msg, ...extra }));
const respond = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const req_id = rid();

  try {
    const auth = req.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) {
      log(req_id, 'UNAUTHENTICATED', 'no bearer token');
      return respond(401, { error: 'Unauthorized', error_code: 'UNAUTHENTICATED', req_id });
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: auth } } }
    );
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(auth.replace('Bearer ', ''));
    const userId = claims?.claims?.sub;
    if (claimsErr || !userId) {
      log(req_id, 'INVALID_TOKEN', 'getClaims failed', { err: claimsErr?.message });
      return respond(401, { error: 'Unauthorized', error_code: 'INVALID_TOKEN', req_id });
    }

    const body = await req.json().catch(() => ({}));
    const { first_name, last_name, phone, bvn, dob } = body ?? {};
    const secret = Deno.env.get('SQUAD_SECRET_KEY');
    if (!secret) {
      log(req_id, 'NO_SQUAD_KEY', 'SQUAD_SECRET_KEY missing');
      return respond(503, { error: 'Squad credentials not configured', error_code: 'NO_SQUAD_KEY', req_id });
    }

    const payload = {
      customer_identifier: userId,
      first_name: first_name || 'Nexora',
      last_name: last_name || 'User',
      mobile_num: phone || '08000000000',
      email: claims?.claims?.email,
      bvn,
      dob,
    };

    const res = await fetch(`${SQUAD_BASE}/virtual-account`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      log(req_id, 'SQUAD_ERROR', 'squad upstream non-2xx', { status: res.status });
      return respond(502, { ...data, error_code: 'SQUAD_ERROR', upstream_status: res.status, req_id });
    }
    log(req_id, 'OK', 'virtual account provisioned', { userId });
    return respond(200, { ...data, req_id });
  } catch (e) {
    log(req_id, 'EXCEPTION', 'unhandled', { err: (e as Error).message });
    return respond(502, { error: 'Provisioning failed', error_code: 'EXCEPTION', req_id });
  }
});
