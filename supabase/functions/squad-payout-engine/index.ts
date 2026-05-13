// Squad Payout Engine. Automated NUBAN settlements via Squad transfer API.
// Authenticated callers only. Authorization is enforced via the profiles.is_admin
// flag using a service-role lookup — no hardcoded email check, no anonymous calls.
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
  console.log(JSON.stringify({ fn: 'squad-payout-engine', req_id, code, msg, ...extra }));
const respond = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const req_id = rid();

  try {
    // 1. Require a real user JWT — block all anonymous callers.
    const auth = req.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) {
      log(req_id, 'UNAUTHENTICATED', 'no bearer token');
      return respond(401, { error: 'Unauthorized', error_code: 'UNAUTHENTICATED', req_id });
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: auth } } }
    );
    const token = auth.replace('Bearer ', '');
    const { data: claimData, error: claimsErr } = await userClient.auth.getClaims(token);
    const userId = claimData?.claims?.sub;
    const role = claimData?.claims?.role;
    if (claimsErr || !userId || role === 'anon') {
      log(req_id, 'INVALID_TOKEN', 'getClaims failed or anon', { err: claimsErr?.message, role });
      return respond(401, { error: 'Unauthorized', error_code: 'INVALID_TOKEN', req_id });
    }

    // 2. Authoritative role check via service-role lookup against profiles.is_admin.
    //    This replaces the legacy hardcoded email gate with a proper claim check.
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceKey) {
      log(req_id, 'NO_SERVICE_KEY', 'SUPABASE_SERVICE_ROLE_KEY missing');
      return respond(503, { error: 'Server misconfigured', error_code: 'NO_SERVICE_KEY', req_id });
    }
    const adminClient = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey);
    const { data: profile, error: profErr } = await adminClient
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .maybeSingle();
    if (profErr) {
      log(req_id, 'PROFILE_LOOKUP_FAILED', 'cannot read profile', { err: profErr.message });
      return respond(502, { error: 'Authorization check failed', error_code: 'PROFILE_LOOKUP_FAILED', req_id });
    }
    if (!profile?.is_admin) {
      log(req_id, 'FORBIDDEN', 'caller is not admin', { userId });
      return respond(403, { error: 'Forbidden', error_code: 'FORBIDDEN', req_id });
    }

    // 3. Validate payload.
    const body = await req.json().catch(() => ({}));
    const { amount_kobo, bank_code, account_number, account_name, remark, transaction_reference } = body ?? {};
    if (!amount_kobo || !bank_code || !account_number || !account_name) {
      log(req_id, 'BAD_INPUT', 'missing payout fields');
      return respond(400, { error: 'Missing fields', error_code: 'BAD_INPUT', req_id });
    }

    const secret = Deno.env.get('SQUAD_SECRET_KEY');
    if (!secret) {
      log(req_id, 'NO_SQUAD_KEY', 'SQUAD_SECRET_KEY missing');
      return respond(503, { error: 'Squad credentials not configured', error_code: 'NO_SQUAD_KEY', req_id });
    }

    const ref = transaction_reference || `NXR_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    const payload = {
      transaction_reference: ref,
      amount: String(amount_kobo),
      bank_code,
      account_number,
      account_name,
      currency_id: 'NGN',
      remark: remark || 'Nexora payout',
    };

    const res = await fetch(`${SQUAD_BASE}/payout/transfer`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      log(req_id, 'SQUAD_ERROR', 'squad upstream non-2xx', { status: res.status, ref });
      return respond(502, { ...data, error_code: 'SQUAD_ERROR', upstream_status: res.status, transaction_reference: ref, req_id });
    }
    log(req_id, 'OK', 'payout submitted', { ref, by: userId });
    return respond(200, { ...data, transaction_reference: ref, req_id });
  } catch (e) {
    log(req_id, 'EXCEPTION', 'unhandled', { err: (e as Error).message });
    return respond(502, { error: 'Payout failed', error_code: 'EXCEPTION', req_id });
  }
});
