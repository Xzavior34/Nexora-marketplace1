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
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-squad-signature, x-squad-signature-256, x-request-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

const FN = 'squad-webhook';
const rid = () => crypto.randomUUID().slice(0, 8);
const json = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const log = (req_id: string, level: 'info' | 'warn' | 'error', code: string, msg: string, extra: Record<string, unknown> = {}) => console[level](JSON.stringify({ fn: FN, req_id, code, msg, ...extra, ts: new Date().toISOString() }));

const timingSafeEqual = (a: string, b: string) => {
  const enc = new TextEncoder();
  const aa = enc.encode(a); const bb = enc.encode(b);
  if (aa.length !== bb.length) return false;
  let out = 0;
  for (let i = 0; i < aa.length; i++) out |= aa[i] ^ bb[i];
  return out === 0;
};

async function hmacHex(secret: string, body: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function verifyWebhook(req: Request, rawBody: string) {
  const configuredSecret = Deno.env.get('SQUAD_WEBHOOK_SECRET');
  if (!configuredSecret) return { ok: true, mode: 'not_configured' };
  const header = req.headers.get('x-squad-signature-256') || req.headers.get('x-squad-signature') || req.headers.get('x-signature');
  if (!header) return { ok: false, mode: 'missing_signature' };
  const expected = await hmacHex(configuredSecret, rawBody);
  const got = header.replace(/^sha256=/i, '').trim();
  return { ok: timingSafeEqual(expected, got), mode: 'hmac_sha256' };
}

const normalizeAmount = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const req_id = req.headers.get('x-request-id') || rid();
  const started = Date.now();

  try {
    if (req.method !== 'POST') return json(405, { status: 'ignored', error_code: 'METHOD_NOT_ALLOWED', req_id });

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!SUPABASE_URL || !SERVICE_KEY) return json(503, { status: 'ignored', error_code: 'NO_CONFIG', req_id });

    const rawBody = await req.text();
    const verification = await verifyWebhook(req, rawBody);
    if (!verification.ok) {
      log(req_id, 'warn', 'BAD_SIGNATURE', 'Webhook signature rejected', { mode: verification.mode });
      return json(401, { status: 'rejected', error_code: 'BAD_SIGNATURE', req_id });
    }

    const payload = JSON.parse(rawBody || '{}');
    const eventType = String(payload?.Event || payload?.event || payload?.type || '').toLowerCase();
    const bodyData = payload?.Body || payload?.data || payload?.body || {};
    
    console.log("WEBHOOK HIT");
    console.log("BODY:", JSON.stringify(payload));
    
    log(req_id, 'info', 'RECEIVED', 'Webhook received', { eventType, verification: verification.mode });

    if (!['charge_successful', 'payment_successful', 'transaction_successful'].includes(eventType)) {
      return json(200, { status: 'ignored', reason: 'non_success_event', req_id });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const transactionRef = String(bodyData?.transaction_ref || bodyData?.reference || bodyData?.transaction_reference || '').trim();
    const amount = normalizeAmount(bodyData?.transaction_amount || bodyData?.amount || bodyData?.amount_kobo);

    if (transactionRef.startsWith('SQUAD_TOPUP_')) {
      // Extract user_id for backward compatibility with un-migrated DB
      const parts = transactionRef.split('_');
      const userId = (parts.length >= 3 && parts[2].length === 36) ? parts[2] : null;

      const { data, error } = await supabase.rpc('process_squad_wallet_credit', {
        p_reference: transactionRef,
        p_user_id: userId,
        p_amount_kobo: amount > 0 ? amount : null,
        p_source: 'squad_checkout',
        p_metadata: payload,
      });
      if (error) throw error;
      return json(200, { status: 'processed', result: data, req_id });
    }

    if (transactionRef.startsWith('SQUAD_ESCROW_')) {
      const { data: escrow, error: escErr } = await supabase.from('escrow_transactions').select('*').eq('squad_reference', transactionRef).maybeSingle();
      if (escErr) throw escErr;
      if (escrow?.status === 'pending') {
        await supabase.from('escrow_transactions').update({ status: 'held' }).eq('id', escrow.id).eq('status', 'pending');
        if (escrow.task_id) await supabase.from('tasks').update({ status: 'assigned', assignee_id: escrow.payee_id, worker_id: escrow.payee_id }).eq('id', escrow.task_id);
      }
      return json(200, { status: 'processed', idempotent: escrow?.status !== 'pending', req_id });
    }

    const customerRef = String(bodyData?.customer_identifier || bodyData?.customer_id || '').trim();
    const bankRef = String(bodyData?.bank_transfer_ref || bodyData?.session_id || transactionRef || crypto.randomUUID()).trim();
    if (customerRef && amount > 0) {
      const reference = `SQUAD_VA_${bankRef}`;
      const { data, error } = await supabase.rpc('process_squad_wallet_credit', {
        p_reference: reference,
        p_user_id: customerRef,
        p_amount_kobo: amount,
        p_source: 'virtual_account',
        p_metadata: payload,
      });
      if (error) throw error;
      return json(200, { status: 'processed', result: data, req_id });
    }

    log(req_id, 'warn', 'UNMATCHED_SUCCESS', 'Successful Squad event could not be matched', { duration_ms: Date.now() - started });
    return json(200, { status: 'ignored', reason: 'unmatched_success_event', req_id });
  } catch (err) {
    log(req_id, 'error', 'WEBHOOK_FAILED', 'Webhook failed safely', { err: (err as Error).message, duration_ms: Date.now() - started });
    return json(200, { status: 'accepted_for_retry', error_code: 'SQUAD_WEBHOOK_FAILED', req_id });
  }
});
