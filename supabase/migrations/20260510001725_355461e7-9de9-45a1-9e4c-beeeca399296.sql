
-- 1. Add vault columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS vault_balance BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_save_percentage INT NOT NULL DEFAULT 5
    CHECK (auto_save_percentage >= 0 AND auto_save_percentage <= 50);

-- 2. RPC: deposit kobo from wallet into vault (user-initiated)
CREATE OR REPLACE FUNCTION public.vault_deposit(p_amount_kobo BIGINT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_wallet BIGINT;
  v_vault BIGINT;
BEGIN
  IF v_user IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  IF p_amount_kobo IS NULL OR p_amount_kobo <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Invalid amount');
  END IF;

  SELECT wallet_balance, vault_balance INTO v_wallet, v_vault
  FROM profiles WHERE id = v_user FOR UPDATE;

  IF v_wallet < p_amount_kobo THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient wallet balance');
  END IF;

  UPDATE profiles
  SET wallet_balance = v_wallet - p_amount_kobo,
      vault_balance  = v_vault + p_amount_kobo,
      updated_at = now()
  WHERE id = v_user;

  INSERT INTO wallet_transactions (user_id, type, amount_kobo, balance_after_kobo, description, reference)
  VALUES (v_user, 'withdrawal', p_amount_kobo, v_wallet - p_amount_kobo,
          'AjoSquad Vault deposit', 'VAULT_DEP_' || gen_random_uuid()::text);

  RETURN json_build_object('success', true, 'wallet', v_wallet - p_amount_kobo, 'vault', v_vault + p_amount_kobo);
END;
$$;

-- 3. RPC: withdraw kobo from vault back to wallet
CREATE OR REPLACE FUNCTION public.vault_withdraw(p_amount_kobo BIGINT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_wallet BIGINT;
  v_vault BIGINT;
BEGIN
  IF v_user IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  IF p_amount_kobo IS NULL OR p_amount_kobo <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Invalid amount');
  END IF;

  SELECT wallet_balance, vault_balance INTO v_wallet, v_vault
  FROM profiles WHERE id = v_user FOR UPDATE;

  IF v_vault < p_amount_kobo THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient vault balance');
  END IF;

  UPDATE profiles
  SET wallet_balance = v_wallet + p_amount_kobo,
      vault_balance  = v_vault - p_amount_kobo,
      updated_at = now()
  WHERE id = v_user;

  INSERT INTO wallet_transactions (user_id, type, amount_kobo, balance_after_kobo, description, reference)
  VALUES (v_user, 'deposit', p_amount_kobo, v_wallet + p_amount_kobo,
          'AjoSquad Vault withdrawal', 'VAULT_WD_' || gen_random_uuid()::text);

  RETURN json_build_object('success', true, 'wallet', v_wallet + p_amount_kobo, 'vault', v_vault - p_amount_kobo);
END;
$$;

-- 4. RPC: micro-loan eligibility & request (trust >= 700, vault >= 5k)
CREATE OR REPLACE FUNCTION public.request_micro_loan(p_amount_kobo BIGINT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_score INT;
  v_vault BIGINT;
  v_wallet BIGINT;
  v_max_loan BIGINT;
BEGIN
  IF v_user IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  v_score := public.get_squad_trust_score(v_user);
  SELECT wallet_balance, vault_balance INTO v_wallet, v_vault
  FROM profiles WHERE id = v_user FOR UPDATE;

  IF v_score < 700 THEN
    RETURN json_build_object('success', false, 'error', 'Trust score too low. Need 700+', 'score', v_score);
  END IF;
  IF v_vault < 500000 THEN
    RETURN json_build_object('success', false, 'error', 'Vault must hold at least N5,000 to qualify', 'score', v_score);
  END IF;

  -- Max loan = 3x vault balance, capped at N50,000
  v_max_loan := LEAST(v_vault * 3, 5000000);
  IF p_amount_kobo > v_max_loan THEN
    RETURN json_build_object('success', false, 'error', 'Amount exceeds limit', 'max_loan_kobo', v_max_loan, 'score', v_score);
  END IF;

  UPDATE profiles
  SET wallet_balance = v_wallet + p_amount_kobo, updated_at = now()
  WHERE id = v_user;

  INSERT INTO wallet_transactions (user_id, type, amount_kobo, balance_after_kobo, description, reference)
  VALUES (v_user, 'deposit', p_amount_kobo, v_wallet + p_amount_kobo,
          'Nexora Micro-Loan disbursed via Squad', 'LOAN_' || gen_random_uuid()::text);

  INSERT INTO notifications (user_id, title, body, data)
  VALUES (v_user, 'Loan approved',
          'N' || (p_amount_kobo / 100)::text || ' has been disbursed to your wallet via Squad.',
          jsonb_build_object('type', 'micro_loan', 'amount_kobo', p_amount_kobo));

  RETURN json_build_object('success', true, 'amount_kobo', p_amount_kobo, 'new_wallet', v_wallet + p_amount_kobo, 'score', v_score);
END;
$$;

-- Lock down execution
REVOKE ALL ON FUNCTION public.vault_deposit(BIGINT) FROM public, anon;
REVOKE ALL ON FUNCTION public.vault_withdraw(BIGINT) FROM public, anon;
REVOKE ALL ON FUNCTION public.request_micro_loan(BIGINT) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.vault_deposit(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vault_withdraw(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_micro_loan(BIGINT) TO authenticated;
