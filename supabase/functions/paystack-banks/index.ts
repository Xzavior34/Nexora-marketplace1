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
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");

    if (!PAYSTACK_SECRET_KEY) {
      throw new Error("Server configuration error");
    }

    console.log("Fetching Nigerian banks list...");

    const banksResponse = await fetch("https://api.paystack.co/bank?country=nigeria", {
      headers: { "Authorization": `Bearer ${PAYSTACK_SECRET_KEY}` },
    });

    const banksData = await banksResponse.json();

    if (!banksData.status) {
      return new Response(JSON.stringify({ error: "Failed to fetch banks" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return simplified bank list
    const banks = banksData.data.map((bank: any) => ({
      name: bank.name,
      code: bank.code,
      slug: bank.slug,
    }));

    console.log(`Fetched ${banks.length} banks`);

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
