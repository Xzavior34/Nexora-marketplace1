
-- Add new columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS has_completed_onboarding boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS is_ambassador boolean NOT NULL DEFAULT false;

-- Update check_referral_milestone with new logic:
-- Requires 20 total referred users AND at least 10 completed gigs among them
CREATE OR REPLACE FUNCTION public.check_referral_milestone(p_referrer_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_referred INTEGER;
  v_completed_count INTEGER;
  v_current_balance BIGINT;
  v_new_balance BIGINT;
  v_milestones_earned INTEGER;
  v_milestones_already_paid INTEGER;
  v_milestones_to_pay INTEGER;
  v_reward_kobo BIGINT;
BEGIN
  -- Count total referred users
  SELECT COUNT(*) INTO v_total_referred
  FROM profiles
  WHERE referred_by = p_referrer_id;

  -- Count referred users who completed at least one gig
  SELECT COUNT(DISTINCT p.id) INTO v_completed_count
  FROM profiles p
  JOIN tasks t ON t.assignee_id = p.id AND t.status = 'completed'
  WHERE p.referred_by = p_referrer_id;

  -- New milestone: every group of 20 total referred where at least 10 completed
  -- milestones_earned = MIN(floor(total/20), floor(completed/10))
  v_milestones_earned := LEAST(FLOOR(v_total_referred / 20), FLOOR(v_completed_count / 10));

  SELECT COUNT(*) INTO v_milestones_already_paid
  FROM wallet_transactions
  WHERE user_id = p_referrer_id
    AND description LIKE 'Referral milestone%';

  v_milestones_to_pay := v_milestones_earned - v_milestones_already_paid;

  IF v_milestones_to_pay <= 0 THEN
    RETURN json_build_object('success', true, 'total_referred', v_total_referred, 'completed_referrals', v_completed_count, 'milestones_earned', v_milestones_earned, 'new_rewards', 0);
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

  RETURN json_build_object('success', true, 'total_referred', v_total_referred, 'completed_referrals', v_completed_count, 'milestones_earned', v_milestones_earned, 'new_rewards', v_milestones_to_pay, 'reward_kobo', v_reward_kobo);

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;
