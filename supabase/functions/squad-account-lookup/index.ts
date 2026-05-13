// Squad Account Lookup. Verify worker bank details live before payout.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SQUAD_BASE = (Deno.env.get('SQUAD_ENV') ?? 'sandbox') === 'live'
  ? 'https://api-d.squadco.com'
  : 'https://sandbox-api-d.squadco.com';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { bank_code, account_number } = await req.json();
    if (!bank_code || !account_number) {
      return new Response(JSON.stringify({ error: 'bank_code & account_number required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const secret = Deno.env.get('SQUAD_SECRET_KEY');
    if (!secret) {
      return new Response(JSON.stringify({ error: 'SQUAD_SECRET_KEY missing' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const res = await fetch(`${SQUAD_BASE}/payout/account/lookup`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bank_code, account_number }),
    });
    const data = await res.json().catch(() => ({}));
    return new Response(JSON.stringify(data), { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
