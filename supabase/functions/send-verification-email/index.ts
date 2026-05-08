import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerificationRequest {
  email: string;
  userId?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!RESEND_API_KEY) {
      console.error("Missing RESEND_API_KEY");
      return new Response(JSON.stringify({ 
        error: "Email service not configured. Please contact support." 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing Supabase environment variables");
      return new Response(JSON.stringify({ 
        error: "Server configuration error" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, userId }: VerificationRequest = await req.json();
    
    if (!email) {
      return new Response(JSON.stringify({ 
        error: "Email is required" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Sending verification email to: ${email}`);

    // Accept any valid email - no domain restriction
    console.log(`Processing verification for: ${email}`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user ID from email if not provided
    let targetUserId = userId;
    
    if (!targetUserId) {
      // First try to find the user in profiles
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .single();

      if (!profileError && profile) {
        targetUserId = profile.id;
        console.log(`Found user in profiles: ${targetUserId}`);
      } else {
        console.log("Profile not found, checking auth.users...");
        
        // Try to find the user in auth.users
        const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
        
        // Generic response to prevent email enumeration — never reveal whether the email exists
        const genericResponse = new Response(JSON.stringify({
          success: true,
          message: "If an account exists with this email, a verification code has been sent.",
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

        if (authError) {
          console.error("Auth lookup error:", authError);
          return genericResponse;
        }

        const authUser = authData.users.find(u => u.email === email);
        if (!authUser) {
          console.log("Email not found — returning generic success to prevent enumeration");
          return genericResponse;
        }

        targetUserId = authUser.id;
        console.log(`Found user in auth.users: ${targetUserId}`);

        // Check if profile exists, if not wait a moment for trigger
        const { data: checkProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", targetUserId)
          .single();

        if (!checkProfile) {
          console.log("Profile not yet created, waiting...");
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    if (!targetUserId) {
      // Generic success — do not reveal that the user wasn't found
      return new Response(JSON.stringify({
        success: true,
        message: "If an account exists with this email, a verification code has been sent.",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log(`Target user ID: ${targetUserId}`);

    // Generate 6-digit code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Save code to profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        verification_code: verificationCode,
        verification_expires_at: expiresAt.toISOString(),
      })
      .eq("id", targetUserId);

    if (updateError) {
      console.error("Failed to save verification code:", updateError);
      return new Response(JSON.stringify({ 
        error: "Failed to save verification code. Please try again." 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Verification code saved for user: ${targetUserId}`);

    // Send email using Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "UniGigs <onboarding@resend.dev>",
        to: [email],
        subject: "Verify Your UniGigs Account",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
              .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(34, 139, 34, 0.1); }
              .header { background: linear-gradient(135deg, #228B22, #1a6b1a); padding: 32px; text-align: center; }
              .header h1 { color: white; margin: 0; font-size: 24px; }
              .content { padding: 32px; text-align: center; }
              .code { font-size: 40px; font-weight: bold; color: #228B22; letter-spacing: 8px; padding: 24px; background: #f0fff0; border-radius: 12px; margin: 24px 0; }
              .expires { color: #666; font-size: 14px; margin-top: 16px; }
              .footer { padding: 24px; text-align: center; background: #f9f9f9; color: #888; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎓 UniGigs</h1>
              </div>
              <div class="content">
                <h2 style="color: #333; margin-bottom: 8px;">Welcome!</h2>
                <p style="color: #666; margin-bottom: 24px;">Use the code below to verify your account:</p>
                <div class="code">${verificationCode}</div>
                <p class="expires">This code expires in 15 minutes</p>
              </div>
              <div class="footer">
                <p>For Students, By Students 💚</p>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    });

    const emailData = await emailResponse.json();
    console.log("Email API response:", JSON.stringify(emailData));

    if (!emailResponse.ok) {
      console.error("Resend error:", emailData);
      return new Response(JSON.stringify({ 
        error: emailData.message || "Failed to send email. Please try again." 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Email sent successfully to:", email);

    return new Response(JSON.stringify({
      success: true,
      message: "Verification code sent to your email",
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    const error = err as Error;
    console.error("Error sending verification email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
