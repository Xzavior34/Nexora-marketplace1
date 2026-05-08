
-- Atomic hire + escrow lock function
CREATE OR REPLACE FUNCTION public.hire_and_escrow(
  p_task_id UUID,
  p_poster_id UUID,
  p_assignee_id UUID,
  p_application_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_price_kobo BIGINT;
  v_current_balance BIGINT;
  v_new_balance BIGINT;
  v_escrow_id UUID;
  v_task_status TEXT;
BEGIN
  -- Lock and get task details
  SELECT price_kobo, status INTO v_price_kobo, v_task_status
  FROM tasks WHERE id = p_task_id FOR UPDATE;

  IF v_price_kobo IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Task not found');
  END IF;

  IF v_task_status != 'open' THEN
    RETURN json_build_object('success', false, 'error', 'Task is no longer open');
  END IF;

  -- Lock poster profile and check balance
  SELECT wallet_balance INTO v_current_balance
  FROM profiles WHERE id = p_poster_id FOR UPDATE;

  IF v_current_balance IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  IF v_current_balance < v_price_kobo THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient funds. Please top up your wallet to hire this worker.');
  END IF;

  -- Deduct from poster wallet
  v_new_balance := v_current_balance - v_price_kobo;
  UPDATE profiles SET wallet_balance = v_new_balance, updated_at = now()
  WHERE id = p_poster_id;

  -- Create escrow transaction (held)
  INSERT INTO escrow_transactions (
    task_id, payer_id, payee_id, amount_kobo, platform_fee_kobo, status
  ) VALUES (
    p_task_id, p_poster_id, p_assignee_id, v_price_kobo, 0, 'held'
  ) RETURNING id INTO v_escrow_id;

  -- Update task
  UPDATE tasks SET assignee_id = p_assignee_id, status = 'assigned', updated_at = now()
  WHERE id = p_task_id;

  -- Accept application
  IF p_application_id IS NOT NULL THEN
    UPDATE task_applications SET status = 'accepted'
    WHERE id = p_application_id;
  END IF;

  -- Record wallet transaction
  INSERT INTO wallet_transactions (
    user_id, type, amount_kobo, balance_after_kobo, description, reference, escrow_id
  ) VALUES (
    p_poster_id, 'escrow_hold', v_price_kobo, v_new_balance,
    'Escrow hold for gig hire',
    'ESCROW_' || v_escrow_id::TEXT,
    v_escrow_id
  );

  RETURN json_build_object(
    'success', true,
    'escrow_id', v_escrow_id,
    'new_balance', v_new_balance,
    'amount_locked', v_price_kobo
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Update referral reward from 1000 NGN to 5000 NGN (100000 -> 500000 kobo)
CREATE OR REPLACE FUNCTION public.check_referral_milestone(p_referrer_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_completed_count INTEGER;
  v_current_balance BIGINT;
  v_new_balance BIGINT;
  v_milestones_earned INTEGER;
  v_milestones_already_paid INTEGER;
  v_milestones_to_pay INTEGER;
  v_reward_kobo BIGINT;
BEGIN
  SELECT COUNT(DISTINCT p.id) INTO v_completed_count
  FROM profiles p
  JOIN tasks t ON t.assignee_id = p.id AND t.status = 'completed'
  WHERE p.referred_by = p_referrer_id;

  v_milestones_earned := FLOOR(v_completed_count / 10);

  SELECT COUNT(*) INTO v_milestones_already_paid
  FROM wallet_transactions
  WHERE user_id = p_referrer_id
    AND description LIKE 'Referral milestone%';

  v_milestones_to_pay := v_milestones_earned - v_milestones_already_paid;

  IF v_milestones_to_pay <= 0 THEN
    RETURN json_build_object('success', true, 'completed_referrals', v_completed_count, 'milestones_earned', v_milestones_earned, 'new_rewards', 0);
  END IF;

  v_reward_kobo := v_milestones_to_pay * 500000;

  SELECT wallet_balance INTO v_current_balance
  FROM profiles WHERE id = p_referrer_id FOR UPDATE;

  v_new_balance := v_current_balance + v_reward_kobo;

  UPDATE profiles SET wallet_balance = v_new_balance, updated_at = now()
  WHERE id = p_referrer_id;

  INSERT INTO wallet_transactions (user_id, type, amount_kobo, balance_after_kobo, description, reference)
  VALUES (p_referrer_id, 'deposit', v_reward_kobo, v_new_balance,
    'Referral milestone reward: ' || v_milestones_to_pay || ' x ₦5,000',
    'REF_REWARD_' || p_referrer_id::text || '_' || v_milestones_earned);

  INSERT INTO notifications (user_id, title, body, data)
  VALUES (p_referrer_id, '🎉 Referral Reward!',
    'You earned ₦' || (v_reward_kobo / 100) || ' for reaching ' || (v_milestones_earned * 10) || ' completed referrals!',
    json_build_object('type', 'referral_reward', 'amount_kobo', v_reward_kobo)::jsonb);

  RETURN json_build_object('success', true, 'completed_referrals', v_completed_count, 'milestones_earned', v_milestones_earned, 'new_rewards', v_milestones_to_pay, 'reward_kobo', v_reward_kobo);

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;
