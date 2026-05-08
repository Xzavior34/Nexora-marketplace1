import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentEmailRequest {
  email: string;
  name: string;
  amount: number;
  taskTitle?: string;
  type: "escrow_release" | "escrow_refund";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, amount, taskTitle, type }: PaymentEmailRequest = await req.json();

    console.log(`Sending payment email to ${email}, type: ${type}, amount: ₦${amount}`);

    if (!email) {
      throw new Error("Email is required");
    }

    const isRelease = type === "escrow_release";
    const subject = isRelease 
      ? `🎉 Payment Received: ₦${amount.toLocaleString()}` 
      : `💰 Refund Processed: ₦${amount.toLocaleString()}`;
    
    const title = isRelease ? "Payment Received!" : "Refund Processed";
    const message = isRelease
      ? `Congratulations! You've received payment for completing a gig.`
      : `Your payment has been refunded to your wallet.`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <tr>
              <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">
                  ${isRelease ? '🎉' : '💰'} ${title}
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 40px 30px;">
                <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                  Hi ${name || 'there'},
                </p>
                <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                  ${message}
                </p>
                
                <div style="background-color: #f0fdf4; border-radius: 12px; padding: 25px; text-align: center; margin-bottom: 30px;">
                  <p style="color: #059669; font-size: 14px; margin: 0 0 5px; text-transform: uppercase; letter-spacing: 1px;">
                    Amount ${isRelease ? 'Received' : 'Refunded'}
                  </p>
                  <p style="color: #047857; font-size: 36px; font-weight: 700; margin: 0;">
                    ₦${amount.toLocaleString()}
                  </p>
                  ${taskTitle ? `
                    <p style="color: #6b7280; font-size: 14px; margin: 15px 0 0;">
                      Task: ${taskTitle}
                    </p>
                  ` : ''}
                </div>

                <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
                  The funds have been added to your wallet and are available for withdrawal.
                  ${isRelease ? 'A 10% platform fee will be deducted when you withdraw.' : ''}
                </p>

                <div style="text-align: center; margin-top: 30px;">
                  <a href="https://unigig.site/dashboard" 
                     style="display: inline-block; padding: 14px 30px; background: linear-gradient(135deg, #2D5A3D 0%, #1a472a 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    View Dashboard
                  </a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding: 30px; background-color: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  © ${new Date().getFullYear()} UniGig. All rights reserved.
                </p>
                <p style="color: #9ca3af; font-size: 12px; margin: 10px 0 0;">
                  This is an automated message, please do not reply directly.
                </p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "UniGig <onboarding@resend.dev>",
      to: [email],
      subject: subject,
      html: html,
    });

    console.log("Payment email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending payment email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
