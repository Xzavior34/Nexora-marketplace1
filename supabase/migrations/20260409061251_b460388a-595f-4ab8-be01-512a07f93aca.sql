
-- Add referral columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by UUID;

-- Generate referral codes for existing users
UPDATE public.profiles
SET referral_code = UPPER(SUBSTRING(md5(id::text || now()::text) FROM 1 FOR 8))
WHERE referral_code IS NULL;

-- Function to generate referral code on new user
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := UPPER(SUBSTRING(md5(NEW.id::text || now()::text) FROM 1 FOR 8));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_generate_referral_code ON public.profiles;
CREATE TRIGGER trigger_generate_referral_code
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.generate_referral_code();

-- RPC: Check referral milestones and credit rewards
CREATE OR REPLACE FUNCTION public.check_referral_milestone(p_referrer_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  v_reward_kobo := v_milestones_to_pay * 100000;

  SELECT wallet_balance INTO v_current_balance
  FROM profiles WHERE id = p_referrer_id FOR UPDATE;

  v_new_balance := v_current_balance + v_reward_kobo;

  UPDATE profiles SET wallet_balance = v_new_balance, updated_at = now()
  WHERE id = p_referrer_id;

  INSERT INTO wallet_transactions (user_id, type, amount_kobo, balance_after_kobo, description, reference)
  VALUES (p_referrer_id, 'deposit', v_reward_kobo, v_new_balance,
    'Referral milestone reward: ' || v_milestones_to_pay || ' x ₦1,000',
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
