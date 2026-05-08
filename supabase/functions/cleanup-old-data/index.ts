import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    console.log("Starting cleanup of old data...");

    // Delete messages older than 1 month
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const cutoffDate = oneMonthAgo.toISOString();

    const { data: deletedMessages, error: messagesError } = await supabase
      .from('messages')
      .delete()
      .lt('created_at', cutoffDate)
      .select('id');

    if (messagesError) {
      console.error('Error deleting old messages:', messagesError);
    } else {
      console.log(`Deleted ${deletedMessages?.length || 0} old messages`);
    }

    // Get completed/cancelled tasks older than 3 months
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const taskCutoffDate = threeMonthsAgo.toISOString();

    const { data: oldTasks, error: tasksQueryError } = await supabase
      .from('tasks')
      .select('id')
      .in('status', ['completed', 'cancelled'])
      .lt('updated_at', taskCutoffDate);

    if (tasksQueryError) {
      console.error('Error fetching old tasks:', tasksQueryError);
    } else if (oldTasks && oldTasks.length > 0) {
      const taskIds = oldTasks.map(t => t.id);

      // Delete related records first
      const { error: appsError } = await supabase
        .from('task_applications')
        .delete()
        .in('task_id', taskIds);
      
      if (appsError) console.error('Error deleting old applications:', appsError);

      const { error: savedError } = await supabase
        .from('saved_gigs')
        .delete()
        .in('task_id', taskIds);
      
      if (savedError) console.error('Error deleting old saved gigs:', savedError);

      // Delete old escrow transactions that are completed
      const { error: escrowError } = await supabase
        .from('escrow_transactions')
        .delete()
        .in('task_id', taskIds)
        .in('status', ['released', 'refunded']);
      
      if (escrowError) console.error('Error deleting old escrow:', escrowError);

      // Delete old reviews
      const { error: reviewsError } = await supabase
        .from('reviews')
        .delete()
        .in('task_id', taskIds);
      
      if (reviewsError) console.error('Error deleting old reviews:', reviewsError);

      // Finally delete the tasks
      const { data: deletedTasks, error: deleteTasksError } = await supabase
        .from('tasks')
        .delete()
        .in('id', taskIds)
        .select('id');

      if (deleteTasksError) {
        console.error('Error deleting old tasks:', deleteTasksError);
      } else {
        console.log(`Deleted ${deletedTasks?.length || 0} old completed/cancelled tasks (3+ months)`);
      }
    }

    // NOTE: Products in marketplace are NEVER deleted if unsold (stock > 0 or is_available = true)
    // Only delete sold-out products older than 3 months
    const { data: deletedProducts, error: productsError } = await supabase
      .from('products')
      .delete()
      .eq('stock', 0)
      .eq('is_available', false)
      .lt('updated_at', taskCutoffDate)
      .select('id');

    if (productsError) {
      console.error('Error deleting old sold products:', productsError);
    } else {
      console.log(`Deleted ${deletedProducts?.length || 0} old sold-out products (3+ months)`);
    }

    // Delete old notifications (older than 2 months)
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    const notificationCutoff = twoMonthsAgo.toISOString();

    const { data: deletedNotifications, error: notifError } = await supabase
      .from('notifications')
      .delete()
      .lt('created_at', notificationCutoff)
      .select('id');

    if (notifError) {
      console.error('Error deleting old notifications:', notifError);
    } else {
      console.log(`Deleted ${deletedNotifications?.length || 0} old notifications`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        deleted: {
          messages: deletedMessages?.length || 0,
          tasks: oldTasks?.length || 0,
          notifications: deletedNotifications?.length || 0,
          soldProducts: deletedProducts?.length || 0,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Cleanup error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
