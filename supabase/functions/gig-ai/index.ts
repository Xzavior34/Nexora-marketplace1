// Nexora Gig AI — Smart Pricing, Optimizer, Voice-to-Gig parser
// All routed through Lovable AI Gateway (google/gemini-2.5-flash).
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { action, payload } = await req.json() as { action: 'price' | 'optimize' | 'parse'; payload: any };
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) return new Response(JSON.stringify({ error: 'AI key missing' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const callAI = async (system: string, user: string) => {
      const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const j = await res.json();
      return j?.choices?.[0]?.message?.content ?? '';
    };

    if (action === 'price') {
      const { title, category, location } = payload || {};
      const text = await callAI(
        'You are a Nigerian gig pricing expert. Suggest a fair price in Naira (integer, no commas) for the gig. Reply with ONLY a JSON object: {"price_naira": number, "reason": "short sentence"}.',
        `Gig title: ${title}\nCategory: ${category}\nLocation: ${location || 'Nigeria'}\nGive a realistic 2026 Nigerian market price.`,
      );
      let parsed: any = {};
      try { parsed = JSON.parse(text.replace(/```json|```/g, '').trim()); } catch { parsed = {}; }
      return new Response(JSON.stringify({
        price_naira: Number(parsed.price_naira) || 3000,
        reason: String(parsed.reason || 'Based on similar Nigerian gigs.'),
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'optimize') {
      const { description, title } = payload || {};
      const text = await callAI(
        'You are a premium gig copywriter for Nexora. Rewrite the description into a punchy, professional, high-converting gig blurb (3-5 sentences max). Keep it warm, clear, and Nigerian-friendly. Reply with ONLY the new description text.',
        `Title: ${title}\nRough notes:\n${description}`,
      );
      return new Response(JSON.stringify({ description: text.trim() }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'parse') {
      const { transcript } = payload || {};
      const text = await callAI(
        'Extract a gig from spoken/typed Nigerian notes. Reply ONLY as JSON: {"title": string (max 60 chars), "description": string (1-3 sentences), "category": one of ["Laundry","Food Delivery","Assignment Help","Tutoring","Errands","Tech Support","Photography","Other"]}.',
        `Notes: ${transcript}`,
      );
      let parsed: any = {};
      try { parsed = JSON.parse(text.replace(/```json|```/g, '').trim()); } catch { parsed = {}; }
      return new Response(JSON.stringify({
        title: String(parsed.title || ''),
        description: String(parsed.description || ''),
        category: String(parsed.category || 'Other'),
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
