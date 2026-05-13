
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS wallet_balance BIGINT DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  amount_kobo BIGINT NOT NULL,
  bank_name TEXT,
  account_number TEXT,
  account_name TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.live_hire_and_lock_escrow(
  p_payee_id UUID, p_task_id UUID, p_amount_kobo BIGINT
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_payer_id UUID := auth.uid();
  v_wallet BIGINT;
BEGIN
  IF v_payer_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF p_amount_kobo IS NULL OR p_amount_kobo <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Invalid amount');
  END IF;

  SELECT wallet_balance INTO v_wallet FROM public.profiles WHERE id = v_payer_id FOR UPDATE;
  IF v_wallet IS NULL OR v_wallet < p_amount_kobo THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance.');
  END IF;

  UPDATE public.profiles SET wallet_balance = wallet_balance - p_amount_kobo WHERE id = v_payer_id;

  INSERT INTO public.escrow_transactions (task_id, payer_id, payee_id, amount_kobo, status)
  VALUES (p_task_id, v_payer_id, p_payee_id, p_amount_kobo, 'held');

  INSERT INTO public.wallet_transactions (user_id, type, amount_kobo, balance_after_kobo, status, description)
  VALUES (v_payer_id, 'escrow_hold', -p_amount_kobo, (SELECT wallet_balance FROM public.profiles WHERE id = v_payer_id), 'success', 'Escrow lock for gig');

  UPDATE public.tasks SET status = 'in_progress', assignee_id = p_payee_id, updated_at = now() WHERE id = p_task_id;

  RETURN json_build_object('success', true);
END; $$;

CREATE OR REPLACE FUNCTION public.initiate_manual_withdrawal(
  p_amount_kobo BIGINT, p_bank_name TEXT, p_account_number TEXT, p_account_name TEXT
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user UUID := auth.uid();
  v_wallet BIGINT;
  v_req UUID;
BEGIN
  IF v_user IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF p_amount_kobo IS NULL OR p_amount_kobo < 50000 THEN
    RETURN json_build_object('success', false, 'error', 'Minimum withdrawal is N500');
  END IF;

  SELECT wallet_balance INTO v_wallet FROM public.profiles WHERE id = v_user FOR UPDATE;
  IF v_wallet IS NULL OR v_wallet < p_amount_kobo THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance.');
  END IF;

  UPDATE public.profiles SET wallet_balance = wallet_balance - p_amount_kobo WHERE id = v_user;

  INSERT INTO public.withdrawal_requests (user_id, amount_kobo, bank_name, account_number, account_name, status)
  VALUES (v_user, p_amount_kobo, p_bank_name, p_account_number, p_account_name, 'pending')
  RETURNING id INTO v_req;

  INSERT INTO public.wallet_transactions (user_id, type, amount_kobo, balance_after_kobo, status, description)
  VALUES (v_user, 'withdrawal', -p_amount_kobo, (SELECT wallet_balance FROM public.profiles WHERE id = v_user), 'pending', 'Manual payout queued');

  RETURN json_build_object('success', true, 'request_id', v_req);
END; $$;

GRANT EXECUTE ON FUNCTION public.live_hire_and_lock_escrow(UUID, UUID, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.initiate_manual_withdrawal(BIGINT, TEXT, TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
