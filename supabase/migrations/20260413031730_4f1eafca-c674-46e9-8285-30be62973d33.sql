
-- 1. Chat attachments storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload chat attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-attachments');

CREATE POLICY "Anyone can view chat attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-attachments');

-- 2. Ambassador 5% first-gig bonus
CREATE OR REPLACE FUNCTION public.ambassador_first_gig_bonus(p_worker_id uuid, p_gig_price_kobo bigint)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_referrer_id UUID;
  v_is_ambassador BOOLEAN;
  v_prior_completed INTEGER;
  v_bonus_kobo BIGINT;
  v_referrer_balance BIGINT;
  v_new_balance BIGINT;
BEGIN
  -- Find who referred this worker
  SELECT referred_by INTO v_referrer_id FROM profiles WHERE id = p_worker_id;
  IF v_referrer_id IS NULL THEN
    RETURN json_build_object('success', true, 'bonus_paid', false, 'reason', 'Worker has no referrer');
  END IF;

  -- Check if referrer is an ambassador
  SELECT is_ambassador INTO v_is_ambassador FROM profiles WHERE id = v_referrer_id;
  IF NOT v_is_ambassador THEN
    RETURN json_build_object('success', true, 'bonus_paid', false, 'reason', 'Referrer is not an ambassador');
  END IF;

  -- Check if worker has completed gigs BEFORE this one (this should be called AFTER status update)
  SELECT COUNT(*) INTO v_prior_completed
  FROM tasks WHERE assignee_id = p_worker_id AND status = 'completed';

  -- Only pay on the FIRST completed gig (count should be exactly 1 after completion)
  IF v_prior_completed != 1 THEN
    RETURN json_build_object('success', true, 'bonus_paid', false, 'reason', 'Not the first completed gig');
  END IF;

  -- Calculate 5% bonus
  v_bonus_kobo := FLOOR(p_gig_price_kobo * 0.05);
  IF v_bonus_kobo <= 0 THEN
    RETURN json_build_object('success', true, 'bonus_paid', false, 'reason', 'Bonus too small');
  END IF;

  -- Credit ambassador
  SELECT wallet_balance INTO v_referrer_balance FROM profiles WHERE id = v_referrer_id FOR UPDATE;
  v_new_balance := v_referrer_balance + v_bonus_kobo;

  UPDATE profiles SET wallet_balance = v_new_balance, updated_at = now() WHERE id = v_referrer_id;

  INSERT INTO wallet_transactions (user_id, type, amount_kobo, balance_after_kobo, description, reference)
  VALUES (v_referrer_id, 'deposit', v_bonus_kobo, v_new_balance,
    'Ambassador bonus: 5% of referral''s first gig (₦' || (p_gig_price_kobo / 100)::TEXT || ')',
    'AMB_BONUS_' || p_worker_id::TEXT);

  INSERT INTO notifications (user_id, title, body, data)
  VALUES (v_referrer_id, '🏆 Ambassador Bonus!',
    'Your referral completed their first gig! You earned ₦' || (v_bonus_kobo / 100)::TEXT || ' (5% bonus).',
    json_build_object('type', 'ambassador_bonus', 'amount_kobo', v_bonus_kobo, 'worker_id', p_worker_id)::jsonb);

  RETURN json_build_object('success', true, 'bonus_paid', true, 'bonus_kobo', v_bonus_kobo, 'new_balance', v_new_balance);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 3. Post-cancellation freeze function
CREATE OR REPLACE FUNCTION public.freeze_poster_funds(p_task_id uuid, p_reporter_id uuid, p_poster_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_task_status TEXT;
  v_price_kobo BIGINT;
  v_poster_balance BIGINT;
  v_new_balance BIGINT;
  v_escrow_id UUID;
BEGIN
  -- Get task info
  SELECT status, price_kobo INTO v_task_status, v_price_kobo
  FROM tasks WHERE id = p_task_id;

  IF v_task_status IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Task not found');
  END IF;

  -- Lock poster balance
  SELECT wallet_balance INTO v_poster_balance FROM profiles WHERE id = p_poster_id FOR UPDATE;

  IF v_poster_balance < v_price_kobo THEN
    -- Can't freeze full amount, freeze what's available
    v_price_kobo := v_poster_balance;
  END IF;

  IF v_price_kobo <= 0 THEN
    RETURN json_build_object('success', true, 'frozen', false, 'reason', 'No funds to freeze');
  END IF;

  -- Deduct from poster
  v_new_balance := v_poster_balance - v_price_kobo;
  UPDATE profiles SET wallet_balance = v_new_balance, updated_at = now() WHERE id = p_poster_id;

  -- Create a new escrow in disputed state
  INSERT INTO escrow_transactions (task_id, payer_id, payee_id, amount_kobo, platform_fee_kobo, status)
  VALUES (p_task_id, p_poster_id, p_reporter_id, v_price_kobo, 0, 'disputed')
  RETURNING id INTO v_escrow_id;

  -- Record the transaction
  INSERT INTO wallet_transactions (user_id, type, amount_kobo, balance_after_kobo, description, reference, escrow_id)
  VALUES (p_poster_id, 'escrow_hold', v_price_kobo, v_new_balance,
    'Funds frozen - dispute under review', 'FREEZE_' || v_escrow_id::TEXT, v_escrow_id);

  -- Update task to disputed
  UPDATE tasks SET status = 'disputed', updated_at = now() WHERE id = p_task_id;

  -- Notify poster
  INSERT INTO notifications (user_id, title, body, data)
  VALUES (p_poster_id, '⚠️ Funds Frozen',
    'Your recent cancellation is under review. ₦' || (v_price_kobo / 100)::TEXT || ' has been temporarily frozen.',
    json_build_object('type', 'funds_frozen', 'taskId', p_task_id, 'amount_kobo', v_price_kobo)::jsonb);

  RETURN json_build_object('success', true, 'frozen', true, 'amount_kobo', v_price_kobo, 'escrow_id', v_escrow_id, 'new_balance', v_new_balance);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 4. Enable realtime on disputes and withdrawal_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.disputes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawal_requests;
