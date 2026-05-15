import { createClient } from 'npm:@supabase/supabase-js@2.89.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

const FN = 'squad-topup-initialize';
const rid = () => crypto.randomUUID().slice(0, 8);
const json = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const log = (req_id: string, level: 'info' | 'warn' | 'error', code: string, msg: string, extra: Record<string, unknown> = {}) => console[level](JSON.stringify({ fn: FN, req_id, code, msg, ...extra, ts: new Date().toISOString() }));
const baseUrl = () => (Deno.env.get('SQUAD_ENV') || 'sandbox').toLowerCase() === 'live' ? 'https://api-d.squadco.com' : 'https://sandbox-api-d.squadco.com';

async function fetchWithTimeout(url: string, init: RequestInit, ms = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('timeout'), ms);
  try { return await fetch(url, { ...init, signal: controller.signal }); } finally { clearTimeout(timer); }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const req_id = req.headers.get('x-request-id') || rid();
  const started = Date.now();
  try {
    if (req.method !== 'POST') return json(405, { error: 'Method not allowed', error_code: 'METHOD_NOT_ALLOWED', req_id });
    const SQUAD_SECRET_KEY = Deno.env.get('SQUAD_SECRET_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!SQUAD_SECRET_KEY || !SUPABASE_URL || !SERVICE_KEY) return json(503, { error: 'Payment gateway is not configured', error_code: 'NO_CONFIG', req_id });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json(401, { error: 'Unauthorized', error_code: 'UNAUTHENTICATED', req_id });

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) return json(401, { error: 'Unauthorized', error_code: 'INVALID_TOKEN', req_id });

    const body = await req.json().catch(() => ({}));
    const amount_kobo = Number(body?.amount_kobo);
    if (!Number.isFinite(amount_kobo) || amount_kobo < 10000 || amount_kobo > 50000000) return json(400, { error: 'Deposit amount must be between ₦100 and ₦500,000', error_code: 'BAD_AMOUNT', req_id });

    const transaction_ref = `SQUAD_TOPUP_${user.id}_${crypto.randomUUID()}`;
    const origin = req.headers.get('origin') || 'https://unigig.site';

    const { error: topupErr } = await supabase.from('wallet_topups').insert({ user_id: user.id, amount_kobo, squad_reference: transaction_ref, status: 'pending', transaction_status: 'pending' });
    if (topupErr) throw topupErr;

    const initRes = await fetchWithTimeout(`${baseUrl()}/transaction/initiate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SQUAD_SECRET_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amount_kobo, email: user.email, currency: 'NGN', initiate_type: 'inline', transaction_ref, callback_url: `${origin}/payment/callback?reference=${encodeURIComponent(transaction_ref)}`, customer_name: user.user_metadata?.full_name || 'Nexora User' }),
    });
    const text = await initRes.text();
    const initData = text ? JSON.parse(text) : {};
    if (!initRes.ok || !initData?.data?.checkout_url) {
      await supabase.from('wallet_topups').update({ status: 'failed', transaction_status: 'failed' }).eq('squad_reference', transaction_ref);
      log(req_id, 'warn', 'SQUAD_INIT_FAILED', 'Squad init rejected', { upstream_status: initRes.status, duration_ms: Date.now() - started });
      return json(502, { error: initData?.message || 'Payment initialization failed', error_code: 'SQUAD_INIT_FAILED', upstream_status: initRes.status, req_id });
    }

    log(req_id, 'info', 'OK', 'Topup initialized', { duration_ms: Date.now() - started });
    return json(200, { success: true, authorization_url: initData.data.checkout_url, reference: transaction_ref, provider: 'squad', req_id });
  } catch (err) {
    log(req_id, 'error', 'EXCEPTION', 'Topup init crashed safely', { err: (err as Error).message, duration_ms: Date.now() - started });
    return json(502, { error: 'Deposit initialization failed', error_code: 'SQUAD_TOPUP_FAILED', req_id });
  }
});
