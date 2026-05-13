import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SQUAD_SECRET_KEY = Deno.env.get("SQUAD_SECRET_KEY");
    if (!SQUAD_SECRET_KEY) {
      throw new Error("Server configuration error");
    }

    const SQUAD_BASE = (Deno.env.get('SQUAD_ENV') ?? 'sandbox') === 'live'
      ? 'https://api-d.squadco.com'
      : 'https://sandbox-api-d.squadco.com';

    console.log("Fetching Nigerian banks list via Squad...");

    const banksResponse = await fetch(`${SQUAD_BASE}/payout/banks`, {
      headers: { "Authorization": `Bearer ${SQUAD_SECRET_KEY}` },
    });

    const banksData = await banksResponse.json();

    if (!banksResponse.ok || !banksData.data) {
      return new Response(JSON.stringify({ error: "Failed to fetch banks" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return simplified bank list mapped to { name, code } for frontend compatibility
    const banks = banksData.data.map((bank: any) => ({
      name: bank.bank_name || bank.name,
      code: bank.bank_code || bank.code,
    }));

    console.log(`Fetched ${banks.length} banks via Squad`);

    return new Response(JSON.stringify({
      success: true,
      banks: banks,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    const error = err as Error;
    console.error("Error fetching banks:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
