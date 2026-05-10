// AI Dispute Shield - extracts a smart agreement from chat history.
// Returns { agreed_price_kobo, deadline, deliverables }.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatLine { sender: string; content: string; created_at?: string; }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { messages, task_title } = await req.json() as { messages: ChatLine[]; task_title?: string };
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'messages array required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'AI Gateway key missing' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const transcript = messages.slice(-50).map(m => `${m.sender}: ${m.content}`).join('\n');
    const system = `You are the Nexora Dispute Shield. Read the chat transcript between a Nigerian client and a gig worker and extract the agreed deal as strict JSON.
- agreed_price_kobo: integer in kobo (1 Naira = 100 kobo). If they only mention naira, multiply by 100.
- deadline: ISO 8601 datetime string or null if unclear.
- deliverables: short bullet list as a single string, max 200 chars.
- confidence: 0-100 integer.
If the parties never agreed, set price to 0 and confidence below 40.`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: `Gig title: ${task_title ?? 'Unknown'}\n\nTranscript:\n${transcript}\n\nReturn ONLY JSON.` },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'lock_agreement',
            description: 'Lock the agreed terms',
            parameters: {
              type: 'object',
              properties: {
                agreed_price_kobo: { type: 'integer' },
                deadline: { type: ['string', 'null'] },
                deliverables: { type: 'string' },
                confidence: { type: 'integer' },
              },
              required: ['agreed_price_kobo', 'deliverables', 'confidence'],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'lock_agreement' } },
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      return new Response(JSON.stringify({ error: 'AI failed', detail: text }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const aiJson = await aiRes.json();
    const call = aiJson?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    let parsed: any = {};
    try { parsed = typeof call === 'string' ? JSON.parse(call) : call; } catch { parsed = {}; }

    return new Response(JSON.stringify({
      agreed_price_kobo: Number(parsed.agreed_price_kobo) || 0,
      deadline: parsed.deadline || null,
      deliverables: String(parsed.deliverables || ''),
      confidence: Number(parsed.confidence) || 0,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
