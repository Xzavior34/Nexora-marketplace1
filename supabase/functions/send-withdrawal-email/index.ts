import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WithdrawalEmailRequest {
  email: string;
  name: string;
  amount: number;
  status: "approved" | "rejected";
  bankName?: string;
  accountNumber?: string;
  reason?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, amount, status, bankName, accountNumber, reason }: WithdrawalEmailRequest = await req.json();

    console.log(`Sending withdrawal ${status} email to ${email}`);

    const formattedAmount = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);

    let subject: string;
    let htmlContent: string;

    if (status === "approved") {
      subject = `Withdrawal Successful - ${formattedAmount}`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1a472a 0%, #2d5a3d 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: #fff; margin: 0; font-size: 24px;">💸 Withdrawal Successful!</h1>
          </div>
          <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px;">Hi ${name || 'there'},</p>
            <p style="font-size: 16px;">Great news! Your withdrawal has been processed successfully.</p>
            
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Amount Sent</p>
              <p style="margin: 0; font-size: 28px; font-weight: bold; color: #1a472a;">${formattedAmount}</p>
            </div>
            
            <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 5px 0; font-size: 14px; color: #666;">Bank: <strong style="color: #333;">${bankName || 'N/A'}</strong></p>
              <p style="margin: 0; font-size: 14px; color: #666;">Account: <strong style="color: #333;">****${accountNumber?.slice(-4) || 'XXXX'}</strong></p>
            </div>
            
            <p style="font-size: 14px; color: #666;">The funds should reflect in your account shortly. Thank you for using UniGigs!</p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="font-size: 12px; color: #999; text-align: center;">
              This is an automated message from UniGigs. Please do not reply to this email.
            </p>
          </div>
        </body>
        </html>
      `;
    } else {
      subject = `Withdrawal Request Update - ${formattedAmount}`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1a472a 0%, #2d5a3d 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: #fff; margin: 0; font-size: 24px;">Withdrawal Update</h1>
          </div>
          <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px;">Hi ${name || 'there'},</p>
            <p style="font-size: 16px;">We're writing to let you know about your withdrawal request.</p>
            
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Withdrawal Request</p>
              <p style="margin: 0 0 10px 0; font-size: 24px; font-weight: bold; color: #991b1b;">${formattedAmount}</p>
              <p style="margin: 0; font-size: 14px; color: #666;"><strong>Status:</strong> Could not be processed</p>
            </div>
            
            ${reason ? `
            <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #666;"><strong>Reason:</strong> ${reason}</p>
            </div>
            ` : ''}
            
            <p style="font-size: 14px; color: #666;">
              <strong>Good news:</strong> The amount has been refunded to your UniGigs wallet. You can try again or contact support if you need assistance.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="font-size: 12px; color: #999; text-align: center;">
              This is an automated message from UniGigs. Please do not reply to this email.
            </p>
          </div>
        </body>
        </html>
      `;
    }

    const emailResponse = await resend.emails.send({
      from: "UniGigs <onboarding@resend.dev>",
      to: [email],
      subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error("Error sending withdrawal email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
