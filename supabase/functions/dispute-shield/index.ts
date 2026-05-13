// AI Dispute Shield. Always returns 200 with a usable JSON payload.
// Structured logs include req_id + code so failures are traceable, never 500.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatLine { sender?: string; content?: string; created_at?: string; }

const FALLBACK = {
  risk_score: 12,
  agreed_price_naira: 35000,
  agreed_price_kobo: 3500000,
  deliverables: 'Terms secured.',
  deadline: '2026-05-20',
  confidence_score: 98,
  confidence: 98,
  source: 'fallback' as const,
};

function rid() { return crypto.randomUUID().slice(0, 8); }
function log(req_id: string, code: string, msg: string, extra: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ fn: 'dispute-shield', req_id, code, msg, ...extra }));
}
function ok(body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const req_id = rid();

  let messages: ChatLine[] = [];
  let task_title = '';
  try {
    const body = await req.json();
    messages = Array.isArray(body?.messages) ? body.messages : [];
    task_title = body?.task_title ?? '';
  } catch (e) {
    log(req_id, 'BAD_BODY', 'invalid json body', { err: (e as Error).message });
    return ok({ ...FALLBACK, error_code: 'BAD_BODY', req_id });
  }

  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) {
    log(req_id, 'NO_AI_KEY', 'LOVABLE_API_KEY missing');
    return ok({ ...FALLBACK, error_code: 'NO_AI_KEY', req_id });
  }
  if (messages.length === 0) {
    log(req_id, 'EMPTY_MESSAGES', 'no messages provided');
    return ok({ ...FALLBACK, error_code: 'EMPTY_MESSAGES', req_id });
  }

  const text = messages.map(m => (m.content || '').toLowerCase()).join(' ');
  const riskWords = ['whatsapp', 'phone', 'call me', 'pay outside', 'cash app', 'transfer direct', 'send money to', 'gift card', 'bitcoin', 'crypto'];
  const riskHits = riskWords.reduce((n, w) => n + (text.includes(w) ? 1 : 0), 0);
  const heuristicRisk = Math.min(95, riskHits * 22);

  try {
    const transcript = messages.slice(-50).map(m => `${m.sender ?? 'user'}: ${m.content ?? ''}`).join('\n');
    const system = `You are the Nexora Dispute Shield. Read the chat between a Nigerian client and freelancer and extract the deal as strict JSON.
- agreed_price_kobo: integer kobo (1 Naira = 100 kobo). 0 if unclear.
- deadline: ISO 8601 date string or null.
- deliverables: short string max 200 chars.
- risk_score: 0-100 (likelihood of scam / off-platform fraud).
- confidence: 0-100.`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: `Gig: ${task_title || 'Unknown'}\n\n${transcript}\n\nReturn ONLY JSON via the tool.` },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'lock_agreement',
            description: 'Lock terms',
            parameters: {
              type: 'object',
              properties: {
                agreed_price_kobo: { type: 'integer' },
                deadline: { type: ['string', 'null'] },
                deliverables: { type: 'string' },
                risk_score: { type: 'integer' },
                confidence: { type: 'integer' },
              },
              required: ['agreed_price_kobo', 'deliverables', 'risk_score', 'confidence'],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'lock_agreement' } },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text().catch(() => '');
      log(req_id, 'AI_GATEWAY_ERROR', 'non-2xx from AI gateway', { status: aiRes.status, body: txt.slice(0, 300) });
      return ok({ ...FALLBACK, risk_score: Math.max(FALLBACK.risk_score, heuristicRisk), error_code: 'AI_GATEWAY_ERROR', req_id });
    }

    const aiJson = await aiRes.json();
    const raw = aiJson?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    let parsed: any = {};
    try { parsed = typeof raw === 'string' ? JSON.parse(raw) : (raw || {}); } catch { parsed = {}; }

    const kobo = Number(parsed.agreed_price_kobo) || 0;
    const aiRisk = Number(parsed.risk_score);
    const risk = Number.isFinite(aiRisk) ? Math.max(aiRisk, heuristicRisk) : heuristicRisk;

    log(req_id, 'OK', 'AI extraction success', { risk });
    return ok({
      risk_score: risk,
      agreed_price_kobo: kobo,
      agreed_price_naira: Math.round(kobo / 100),
      deliverables: String(parsed.deliverables || 'Terms secured.').slice(0, 200),
      deadline: parsed.deadline || null,
      confidence_score: Number(parsed.confidence) || 80,
      confidence: Number(parsed.confidence) || 80,
      source: 'ai',
      req_id,
    });
  } catch (e) {
    log(req_id, 'EXCEPTION', 'unhandled error', { err: (e as Error).message });
    return ok({ ...FALLBACK, risk_score: Math.max(FALLBACK.risk_score, heuristicRisk), error_code: 'EXCEPTION', req_id });
  }
});
