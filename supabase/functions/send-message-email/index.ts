import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MessageEmailRequest {
  email?: string;
  recipientId: string;
  recipientName?: string;
  senderName: string;
  messagePreview: string;
  taskTitle: string;
  taskId: string;
  isFreelancer?: boolean; // true = freelancer, false = gig poster
}

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Template IDs from Brevo
const FREELANCER_TEMPLATE_ID = 13;
const GIG_POSTER_TEMPLATE_ID = 11;

// 5 minutes in milliseconds
const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * Check if user is online (active in last 5 minutes)
 */
async function isUserOnline(supabase: any, userId: string): Promise<boolean> {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('last_seen_at')
      .eq('id', userId)
      .single();

    if (error || !profile?.last_seen_at) {
      console.log(`User ${userId} has no last_seen_at, treating as offline`);
      return false;
    }

    const lastSeenAt = new Date(profile.last_seen_at).getTime();
    const now = Date.now();
    const timeDifference = now - lastSeenAt;

    const isOnline = timeDifference < ONLINE_THRESHOLD_MS;
    console.log(`User ${userId} last seen ${Math.round(timeDifference / 1000)}s ago - ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
    
    return isOnline;
  } catch (err) {
    console.error('Error checking user online status:', err);
    return false; // Treat as offline on error, send email
  }
}

/**
 * Send email via Brevo API using templates
 */
async function sendBrevoEmail(
  recipientEmail: string,
  recipientName: string,
  senderName: string,
  taskTitle: string,
  messagePreview: string,
  isFreelancer: boolean
): Promise<{ success: boolean; data?: any; error?: string }> {
  const templateId = isFreelancer ? FREELANCER_TEMPLATE_ID : GIG_POSTER_TEMPLATE_ID;
  
  const payload = {
    templateId: templateId,
    to: [{ email: recipientEmail, name: recipientName || 'User' }],
    params: {
      RECIPIENT_NAME: recipientName || 'there',
      SENDER_NAME: senderName || 'Someone',
      TASK_TITLE: taskTitle,
      MESSAGE_PREVIEW: messagePreview.length > 100 ? messagePreview.substring(0, 100) + '...' : messagePreview,
      LINK_TO_CHAT: 'https://unigig.site/messages',
    },
  };

  console.log(`Sending Brevo email with template ${templateId} to ${recipientEmail}`);

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY!,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Brevo API error:', data);
      return { success: false, error: data.message || 'Failed to send email' };
    }

    console.log('Brevo email sent successfully:', data);
    return { success: true, data };
  } catch (err: any) {
    console.error('Error calling Brevo API:', err);
    return { success: false, error: err.message };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: MessageEmailRequest = await req.json();
    let { email, recipientId, recipientName, senderName, messagePreview, taskTitle, taskId, isFreelancer = false } = body;

    if (!recipientId) {
      throw new Error("recipientId is required");
    }

    if (!BREVO_API_KEY) {
      throw new Error("BREVO_API_KEY is not configured");
    }

    // Initialize Supabase client with service role for reading profiles
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Resolve recipient email + name server-side (never trust client-provided email)
    if (!email || !recipientName) {
      const { data: recipient } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', recipientId)
        .single();
      email = recipient?.email || email;
      recipientName = recipient?.full_name || recipientName || 'User';
    }

    if (!email) {
      throw new Error("Could not resolve recipient email");
    }

    console.log(`Processing message notification for ${recipientName} (${email})`);

    // Check if user is online
    const online = await isUserOnline(supabase, recipientId);

    if (online) {
      console.log(`User ${recipientName} is ONLINE - skipping email notification`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          skipped: true,
          reason: 'User is online',
          message: 'User is online, email not sent'
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`User ${recipientName} is OFFLINE - sending email notification`);

    // Determine if recipient is a freelancer based on task context
    // If not explicitly provided, we check if they're the assignee (freelancer) or poster
    let recipientIsFreelancer = isFreelancer;
    
    if (!isFreelancer && taskId) {
      const { data: task } = await supabase
        .from('tasks')
        .select('poster_id, assignee_id')
        .eq('id', taskId)
        .single();

      if (task) {
        // If recipient is the assignee, they're the freelancer
        recipientIsFreelancer = task.assignee_id === recipientId;
      }
    }

    // Send email via Brevo
    const result = await sendBrevoEmail(
      email,
      recipientName,
      senderName,
      taskTitle,
      messagePreview,
      recipientIsFreelancer
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to send email');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        skipped: false,
        data: result.data,
        message: 'Email notification sent'
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-message-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
