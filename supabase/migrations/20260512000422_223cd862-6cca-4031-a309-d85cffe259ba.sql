
-- A. Real-Time Hiring & Escrow Lock Ledger
CREATE OR REPLACE FUNCTION public.live_hire_and_lock_escrow(p_worker_id UUID, p_gig_id UUID, p_amount_kobo BIGINT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id UUID := auth.uid();
  v_client_wallet BIGINT;
  v_escrow_id UUID;
BEGIN
  IF v_client_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentication required.');
  END IF;

  SELECT wallet_balance INTO v_client_wallet FROM profiles WHERE id = v_client_id FOR UPDATE;

  IF v_client_wallet IS NULL OR v_client_wallet < p_amount_kobo THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient funds. Top up your Squad wallet.');
  END IF;

  UPDATE profiles SET wallet_balance = wallet_balance - p_amount_kobo, updated_at = now()
  WHERE id = v_client_id;

  INSERT INTO escrow_transactions (task_id, payer_id, payee_id, poster_id, worker_id, amount_kobo, status)
  VALUES (p_gig_id, v_client_id, p_worker_id, v_client_id, p_worker_id, p_amount_kobo, 'held'::escrow_status)
  RETURNING id INTO v_escrow_id;

  INSERT INTO wallet_transactions (user_id, type, amount_kobo, balance_after_kobo, description, status, escrow_id)
  VALUES (v_client_id, 'escrow_hold'::transaction_type, p_amount_kobo, v_client_wallet - p_amount_kobo,
          'Funds locked in Squad Escrow for active gig', 'success', v_escrow_id);

  RETURN json_build_object('success', true, 'escrow_id', v_escrow_id, 'new_balance', v_client_wallet - p_amount_kobo);
END;
$$;

-- B. Real-Time Dispute & Escrow Freeze
CREATE OR REPLACE FUNCTION public.live_dispute_escrow(p_escrow_id UUID, p_reason TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_balance BIGINT;
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentication required.');
  END IF;

  UPDATE escrow_transactions SET status = 'disputed'::escrow_status, updated_at = now()
  WHERE id = p_escrow_id;

  SELECT wallet_balance INTO v_balance FROM profiles WHERE id = v_uid;

  INSERT INTO wallet_transactions (user_id, type, amount_kobo, balance_after_kobo, description, status, escrow_id)
  VALUES (v_uid, 'escrow_hold'::transaction_type, 0, COALESCE(v_balance, 0),
          'Escrow formally disputed: ' || p_reason, 'success', p_escrow_id);

  RETURN json_build_object('success', true);
END;
$$;

-- C. Real-Time Identity Submission
CREATE OR REPLACE FUNCTION public.submit_live_verification(p_nin_bvn TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentication required.');
  END IF;
  UPDATE profiles SET is_verified = true, updated_at = now() WHERE id = auth.uid();
  RETURN json_build_object('success', true);
END;
$$;

-- D. Initiate Manual Withdrawal (locks funds instantly)
CREATE OR REPLACE FUNCTION public.initiate_manual_withdrawal(
  p_amount_kobo BIGINT,
  p_bank_name TEXT,
  p_account_number TEXT,
  p_account_name TEXT
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_wallet BIGINT;
  v_request_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentication required.');
  END IF;

  IF p_amount_kobo IS NULL OR p_amount_kobo < 10000 THEN
    RETURN json_build_object('success', false, 'error', 'Minimum withdrawal is ₦100.');
  END IF;

  SELECT wallet_balance INTO v_wallet FROM profiles WHERE id = v_user_id FOR UPDATE;

  IF v_wallet IS NULL OR v_wallet < p_amount_kobo THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient available balance.');
  END IF;

  UPDATE profiles SET wallet_balance = wallet_balance - p_amount_kobo, updated_at = now()
  WHERE id = v_user_id;

  INSERT INTO withdrawal_requests (user_id, amount_kobo, bank_name, account_number, account_name, status)
  VALUES (v_user_id, p_amount_kobo, p_bank_name, p_account_number, p_account_name, 'pending')
  RETURNING id INTO v_request_id;

  INSERT INTO wallet_transactions (user_id, type, amount_kobo, balance_after_kobo, description, status)
  VALUES (v_user_id, 'withdrawal'::transaction_type, p_amount_kobo, v_wallet - p_amount_kobo,
          'Manual Payout Initiated: Pending Admin Approval', 'pending');

  RETURN json_build_object('success', true, 'new_balance', v_wallet - p_amount_kobo, 'request_id', v_request_id);
END;
$$;

-- E. Admin Process Payout
CREATE OR REPLACE FUNCTION public.admin_process_withdrawal(p_request_id UUID, p_action TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req RECORD;
  v_admin_email TEXT := lower(auth.jwt() ->> 'email');
BEGIN
  IF NOT (
    v_admin_email = 'unigig60@gmail.com'
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized Admin Desk access.');
  END IF;

  SELECT * INTO v_req FROM withdrawal_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Request not found.');
  END IF;
  IF v_req.status <> 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Request already processed.');
  END IF;

  IF p_action = 'approve' THEN
    UPDATE withdrawal_requests
      SET status = 'completed', processed_at = now(), processed_by = v_admin_email, updated_at = now()
      WHERE id = p_request_id;
    UPDATE wallet_transactions
      SET status = 'success'
      WHERE user_id = v_req.user_id
        AND status = 'pending'
        AND amount_kobo = v_req.amount_kobo
        AND type = 'withdrawal'::transaction_type;
  ELSIF p_action = 'reject' THEN
    UPDATE withdrawal_requests
      SET status = 'rejected', processed_at = now(), processed_by = v_admin_email, updated_at = now()
      WHERE id = p_request_id;
    UPDATE profiles SET wallet_balance = wallet_balance + v_req.amount_kobo, updated_at = now()
      WHERE id = v_req.user_id;
    UPDATE wallet_transactions
      SET status = 'failed', description = 'Withdrawal Rejected: Funds Refunded'
      WHERE user_id = v_req.user_id
        AND status = 'pending'
        AND amount_kobo = v_req.amount_kobo
        AND type = 'withdrawal'::transaction_type;
  ELSE
    RETURN json_build_object('success', false, 'error', 'Invalid action.');
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.live_hire_and_lock_escrow(UUID, UUID, BIGINT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.live_dispute_escrow(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_live_verification(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.initiate_manual_withdrawal(BIGINT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_process_withdrawal(UUID, TEXT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.live_hire_and_lock_escrow(UUID, UUID, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.live_dispute_escrow(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_live_verification(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.initiate_manual_withdrawal(BIGINT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_process_withdrawal(UUID, TEXT) TO authenticated;
