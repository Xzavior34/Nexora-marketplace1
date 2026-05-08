import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Server configuration error");
    }

    const { userId, title, body, data }: NotificationRequest = await req.json();
    
    if (!userId || !title || !body) {
      return new Response(JSON.stringify({ 
        error: "userId, title, and body are required" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Sending notification to user: ${userId}, title: ${title}`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Always store in notifications table for in-app display
    const { error: insertError } = await supabase.from("notifications").insert({
      user_id: userId,
      title,
      body,
      data: data || {},
      read: false,
    });

    if (insertError) {
      console.error("Error inserting notification:", insertError);
      throw insertError;
    }

    console.log("In-app notification created for user:", userId);

    // Try to get push subscriptions for browser push
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId);

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
    }

    if (subscriptions && subscriptions.length > 0) {
      console.log(`Found ${subscriptions.length} push subscriptions for user`);
      // Note: Actual web push would require VAPID keys
      // For now, the in-app notification will suffice
    } else {
      console.log("No push subscriptions found - in-app notification created");
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Notification sent",
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    const error = err as Error;
    console.error("Error sending notification:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
