import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
    if (!BREVO_API_KEY) {
      console.error("Missing BREVO_API_KEY environment variable");
      throw new Error("Missing BREVO_API_KEY");
    }

    const { email, fullName, listId = 7, university } = await req.json();

    if (!email) {
      console.error("No email provided in request body");
      throw new Error("Email is required");
    }

    console.log(`Adding ${email} to Brevo List #${listId}...`);

    // Prepare attributes if fullName or university is provided
    const attributes: Record<string, string> = {};
    if (fullName) {
      attributes.FIRSTNAME = fullName.split(' ')[0] || fullName;
      attributes.LASTNAME = fullName.split(' ').slice(1).join(' ') || '';
    }
    if (university) {
      attributes.UNIVERSITY = university;
    }

    const response = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email,
        listIds: [listId],
        updateEnabled: true,
        attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
      }),
    });

    const data = await response.json();
    console.log("Brevo Response Status:", response.status);
    console.log("Brevo Response Data:", JSON.stringify(data));

    // Handle success or duplicate (both are OK)
    if (!response.ok && data.code !== "duplicate_parameter") {
      console.error("Brevo API Error:", data);
      throw new Error(data.message || JSON.stringify(data));
    }

    console.log(`Successfully added/updated ${email} in Brevo List #${listId}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Error in send-brevo-verification:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});