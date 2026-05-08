import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyTokenRequest {
  token: string;
  user_id: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Server configuration error");
    }

    // NOW EXPECTING USER_ID + TOKEN
    const { token, user_id }: VerifyTokenRequest = await req.json();

    if (!token || !user_id) {
      return new Response(JSON.stringify({ error: "Code and User ID are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Verifying OTP for user ${user_id}...`);

    // Create Admin Client (bypass RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Find the token matching USER + CODE
    const { data: tokenData, error: tokenError } = await supabase
      .from("verification_tokens")
      .select("*")
      .eq("user_id", user_id)
      .eq("token", token) // Matches the 6-digit code
      .single();

    if (tokenError || !tokenData) {
      console.error("Token not found:", tokenError);
      return new Response(JSON.stringify({ 
        error: "Invalid verification code" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Check if expired
    if (new Date(tokenData.expires_at) < new Date()) {
      // Delete expired token to clean up
      await supabase.from("verification_tokens").delete().eq("id", tokenData.id);

      return new Response(JSON.stringify({ 
        error: "Code has expired. Please sign in again to get a new one." 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. IMPORTANT: Update Supabase Auth User (System Level)
    const { error: authError } = await supabase.auth.admin.updateUserById(
      tokenData.user_id,
      { email_confirm: true }
    );

    if (authError) {
      console.error("Failed to confirm auth user:", authError);
      throw new Error("Failed to verify authentication status");
    }

    // 4. Update Public Profile (App Level)
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ 
        is_verified: true,
        verification_code: null,
        verification_expires_at: null
      })
      .eq("id", tokenData.user_id);

    if (updateError) {
      console.error("Failed to update profile:", updateError);
    }

    // 5. Delete the used token
    await supabase
      .from("verification_tokens")
      .delete()
      .eq("id", tokenData.id);

    console.log(`User ${tokenData.user_id} verified successfully`);

    return new Response(JSON.stringify({
      success: true,
      message: "Account verified successfully!",
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    const error = err as Error;
    console.error("Error verifying token:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
