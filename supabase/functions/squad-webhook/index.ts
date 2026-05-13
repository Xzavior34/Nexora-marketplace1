import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const payload = await req.json();
    console.log("Squad Webhook payload received:", JSON.stringify(payload));

    const eventType = payload?.Event || payload?.event;
    const bodyData = payload?.Body || payload?.data;

    if (eventType === 'charge_successful') {
      const transactionRef = bodyData?.transaction_ref || bodyData?.reference;
      const settledAmountKobo = Number(bodyData?.transaction_amount || bodyData?.amount);

      // Scenario 1: Inline Gateway Payments (has transactionRef)
      if (transactionRef) {
        console.log(`Processing inline gateway transaction: ${transactionRef}, amount: ${settledAmountKobo}`);

        // 1A) Wallet topups (initiated via squad-topup-initialize)
        if (transactionRef.startsWith('SQUAD_TOPUP_')) {
          const { data: topup } = await supabase
            .from("wallet_topups")
            .select("*")
            .eq("paystack_reference", transactionRef)
            .maybeSingle();

          if (topup && topup.status !== 'success') {
            // Atomically increment wallet balance
            const { error: ledgerErr } = await supabase.rpc('increment_wallet_balance', {
              p_user_id: topup.user_id,
              p_amount_kobo: topup.amount_kobo
            });

            if (ledgerErr) {
              const { data: userProfile } = await supabase
                .from('profiles')
                .select('wallet_balance')
                .eq('id', topup.user_id)
                .single();

              const currentBal = Number(userProfile?.wallet_balance) || 0;
              await supabase
                .from('profiles')
                .update({ wallet_balance: currentBal + topup.amount_kobo })
                .eq('id', topup.user_id);
            }

            // Record wallet transaction
            await supabase.from('wallet_transactions').insert({
              user_id: topup.user_id,
              type: 'deposit',
              amount_kobo: topup.amount_kobo,
              reference: transactionRef,
              description: `Online wallet deposit of ₦${(topup.amount_kobo / 100).toLocaleString()} via Squad`
            });

            // Mark topup as success
            await supabase
              .from("wallet_topups")
              .update({ status: "success" })
              .eq("id", topup.id);

            console.log(`Wallet topup ${topup.id} successfully settled.`);
          }
        } 
        // 1B) Escrow funding (initiated via squad-initialize)
        else if (transactionRef.startsWith('UNIGIGS_')) {
          const { data: escrow } = await supabase
            .from("escrow_transactions")
            .select("*")
            .eq("paystack_reference", transactionRef)
            .maybeSingle();

          if (escrow && escrow.status === 'pending') {
            // Lock escrow status to held
            await supabase
              .from("escrow_transactions")
              .update({ status: "held" })
              .eq("id", escrow.id);

            // Assign the gig task and advance state
            await supabase
              .from("tasks")
              .update({ status: "assigned", assignee_id: escrow.payee_id })
              .eq("id", escrow.task_id);

            console.log(`Escrow transaction ${escrow.id} set to held, task assigned.`);
          }
        }
      } 
      // Scenario 2: Direct static GTBank virtual account transfers (identified by customer_identifier/UUID)
      else {
        const customerRef = bodyData?.customer_identifier;
        if (customerRef && settledAmountKobo > 0) {
          console.log(`Processing direct virtual account settlement for user: ${customerRef}, amount: ${settledAmountKobo}`);

          // Execute atomic balance increment
          const { error: ledgerErr } = await supabase.rpc('increment_wallet_balance', {
            p_user_id: customerRef,
            p_amount_kobo: settledAmountKobo
          });

          if (ledgerErr) {
            const { data: userProfile } = await supabase
              .from('profiles')
              .select('wallet_balance')
              .eq('id', customerRef)
              .single();

            const currentBal = Number(userProfile?.wallet_balance) || 0;
            await supabase
              .from('profiles')
              .update({ wallet_balance: currentBal + settledAmountKobo })
              .eq('id', customerRef);
          }

          // Log transaction metrics securely
          await supabase.from('wallet_transactions').insert({
            user_id: customerRef,
            type: 'deposit',
            amount_kobo: settledAmountKobo,
            status: 'success',
            description: `Virtual Account Inbound Settlement: ${bodyData?.bank_transfer_ref || 'Squad GTBank transfer'}`
          });

          console.log(`Virtual account settlement for user ${customerRef} complete.`);
        }
      }
    }

    return new Response(JSON.stringify({ status: 'processed' }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  } catch (err: any) {
    console.error("Webhook processing failure:", err.message);
    return new Response(JSON.stringify({ error: 'Ingestion error', message: err.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
