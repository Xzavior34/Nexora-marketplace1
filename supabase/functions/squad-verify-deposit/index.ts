// Verify a Squad deposit reference and credit the user's wallet via the
// idempotent process_squad_wallet_credit RPC. Used as a fallback when the
// Squad webhook hasn't fired yet (common in sandbox or after checkout redirect).
// @ts-expect-error - Supabase module imports cause TS errors in non-Deno setups
import { createClient } from 'npm:@supabase/supabase-js@2.89.0';
// @ts-expect-error - Deno URL imports cause TS errors in non-Deno setups
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

declare const Deno: {
  env: { get(key: string): string | undefined; };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

const FN = 'squad-verify-deposit';
const rid = () => crypto.randomUUID().slice(0, 8);
const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const log = (req_id: string, level: 'info' | 'warn' | 'error', code: string, msg: string, extra: Record<string, unknown> = {}) =>
  console[level](JSON.stringify({ fn: FN, req_id, code, msg, ...extra, ts: new Date().toISOString() }));
const baseUrl = () => (Deno.env.get('SQUAD_ENV') || 'sandbox').toLowerCase() === 'live' ? 'https://api-d.squadco.com' : 'https://sandbox-api-d.squadco.com';

async function fetchWithTimeout(url: string, init: RequestInit, ms = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('timeout'), ms);
  try { return await fetch(url, { ...init, signal: controller.signal }); } finally { clearTimeout(timer); }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const req_id = req.headers.get('x-request-id') || rid();

  try {
    if (req.method !== 'POST') return json(405, { error: 'Method not allowed', error_code: 'METHOD_NOT_ALLOWED', req_id });

    const SQUAD_SECRET_KEY = Deno.env.get('SQUAD_SECRET_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!SQUAD_SECRET_KEY || !SUPABASE_URL || !SERVICE_KEY) {
      return json(503, { error: 'Payment gateway is not configured', error_code: 'NO_CONFIG', req_id });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json(401, { error: 'Unauthorized', error_code: 'UNAUTHENTICATED', req_id });

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: userData, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !userData?.user) return json(401, { error: 'Unauthorized', error_code: 'INVALID_TOKEN', req_id });

    const body = await req.json().catch(() => ({}));
    const reference = String(body?.reference || '').trim();
    if (!reference || reference.length < 8) {
      return json(400, { error: 'Reference is required', error_code: 'BAD_REFERENCE', req_id });
    }

    // Confirm topup belongs to user (defence-in-depth)
    const { data: topup } = await supabase
      .from('wallet_topups')
      .select('user_id, status, amount_kobo')
      .eq('squad_reference', reference)
      .maybeSingle();

    if (topup && topup.user_id !== userData.user.id) {
      return json(403, { error: 'Forbidden', error_code: 'FORBIDDEN', req_id });
    }

    if (topup?.status === 'success') {
      return json(200, { success: true, already_credited: true, status: 'success', req_id });
    }

    // Verify with Squad
    const verifyRes = await fetchWithTimeout(`${baseUrl()}/transaction/verify/${encodeURIComponent(reference)}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${SQUAD_SECRET_KEY}`, 'Content-Type': 'application/json' },
    });
    const text = await verifyRes.text();
    let verifyData: Record<string, unknown> = {};
    try { verifyData = text ? JSON.parse(text) : {}; } catch { verifyData = { raw: text.slice(0, 300) }; }

    if (!verifyRes.ok) {
      log(req_id, 'warn', 'VERIFY_UPSTREAM_FAILED', 'Squad verify failed', { status: verifyRes.status, reference });
      return json(502, { error: 'Could not verify with payment provider', error_code: 'VERIFY_FAILED', upstream_status: verifyRes.status, req_id });
    }

    const data = (verifyData?.data || verifyData) as Record<string, unknown>;
    const status = String(data?.transaction_status || data?.status || '').toLowerCase();
    const amount = Number(data?.transaction_amount || data?.amount || topup?.amount_kobo || 0);

    if (!['success', 'successful', 'paid', 'completed'].includes(status)) {
      log(req_id, 'info', 'NOT_SUCCESSFUL', 'Squad reports not-yet-successful', { status, reference });
      return json(200, { success: false, status: status || 'pending', message: 'Payment not yet successful', req_id });
    }

    const { data: creditResult, error: rpcError } = await supabase.rpc('process_squad_wallet_credit', {
      p_reference: reference,
      p_user_id: userData.user.id,
      p_amount_kobo: amount > 0 ? amount : null,
      p_source: 'squad_checkout_verify',
      p_metadata: verifyData,
    });

    if (rpcError) {
      log(req_id, 'error', 'RPC_FAILED', rpcError.message, { reference });
      return json(500, { error: 'Could not credit wallet', error_code: 'RPC_FAILED', req_id });
    }

    log(req_id, 'info', 'CREDITED', 'Wallet credited via verify fallback', { reference });
    return json(200, { success: true, status: 'success', result: creditResult, req_id });
  } catch (err) {
    log(req_id, 'error', 'EXCEPTION', (err as Error).message);
    return json(500, { error: 'Verification failed', error_code: 'EXCEPTION', req_id });
  }
});
