-- Create atomic withdrawal function to prevent double-spending
CREATE OR REPLACE FUNCTION public.process_withdrawal(
  p_user_id UUID,
  p_amount_kobo BIGINT,
  p_bank_name TEXT,
  p_account_number TEXT,
  p_account_name TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance BIGINT;
  v_new_balance BIGINT;
  v_request_id UUID;
BEGIN
  -- Lock the row to prevent concurrent modifications
  SELECT wallet_balance INTO v_current_balance
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;
  
  -- Check if user exists
  IF v_current_balance IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Check minimum withdrawal (₦100 = 10000 kobo)
  IF p_amount_kobo < 10000 THEN
    RETURN json_build_object('success', false, 'error', 'Minimum withdrawal is ₦100');
  END IF;
  
  -- Check sufficient balance
  IF v_current_balance < p_amount_kobo THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance');
  END IF;
  
  -- Calculate new balance
  v_new_balance := v_current_balance - p_amount_kobo;
  
  -- Deduct from wallet (atomic operation)
  UPDATE profiles
  SET wallet_balance = v_new_balance,
      updated_at = now()
  WHERE id = p_user_id;
  
  -- Create withdrawal request
  INSERT INTO withdrawal_requests (
    user_id,
    amount_kobo,
    bank_name,
    account_number,
    account_name,
    status
  )
  VALUES (
    p_user_id,
    p_amount_kobo,
    p_bank_name,
    p_account_number,
    p_account_name,
    'pending'
  )
  RETURNING id INTO v_request_id;
  
  -- Record wallet transaction
  INSERT INTO wallet_transactions (
    user_id,
    type,
    amount_kobo,
    balance_after_kobo,
    description,
    reference
  )
  VALUES (
    p_user_id,
    'withdrawal',
    p_amount_kobo,
    v_new_balance,
    'Withdrawal to ' || p_bank_name || ' - ' || p_account_number,
    'WD_' || v_request_id::TEXT
  );
  
  RETURN json_build_object(
    'success', true,
    'request_id', v_request_id,
    'new_balance', v_new_balance
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Create refund function for failed/rejected withdrawals
CREATE OR REPLACE FUNCTION public.refund_withdrawal(
  p_request_id UUID,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_amount_kobo BIGINT;
  v_current_balance BIGINT;
  v_new_balance BIGINT;
  v_status TEXT;
BEGIN
  -- Get withdrawal request details and lock
  SELECT user_id, amount_kobo, status INTO v_user_id, v_amount_kobo, v_status
  FROM withdrawal_requests
  WHERE id = p_request_id
  FOR UPDATE;
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Withdrawal request not found');
  END IF;
  
  IF v_status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Request already processed');
  END IF;
  
  -- Lock user profile and get balance
  SELECT wallet_balance INTO v_current_balance
  FROM profiles
  WHERE id = v_user_id
  FOR UPDATE;
  
  v_new_balance := v_current_balance + v_amount_kobo;
  
  -- Refund to wallet
  UPDATE profiles
  SET wallet_balance = v_new_balance,
      updated_at = now()
  WHERE id = v_user_id;
  
  -- Update withdrawal request
  UPDATE withdrawal_requests
  SET status = 'rejected',
      admin_notes = p_admin_notes,
      processed_at = now(),
      updated_at = now()
  WHERE id = p_request_id;
  
  -- Record refund transaction
  INSERT INTO wallet_transactions (
    user_id,
    type,
    amount_kobo,
    balance_after_kobo,
    description,
    reference
  )
  VALUES (
    v_user_id,
    'refund',
    v_amount_kobo,
    v_new_balance,
    'Withdrawal refund - ' || COALESCE(p_admin_notes, 'Rejected'),
    'REFUND_' || p_request_id::TEXT
  );
  
  RETURN json_build_object(
    'success', true,
    'refunded_amount', v_amount_kobo,
    'new_balance', v_new_balance
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Drop old admin RLS policies with old email
DROP POLICY IF EXISTS "Admin can view all withdrawal requests" ON withdrawal_requests;
DROP POLICY IF EXISTS "Admin can update withdrawal requests" ON withdrawal_requests;

-- Create new admin RLS policies with new email
CREATE POLICY "Admin can view all withdrawal requests" 
ON withdrawal_requests 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.email = 'inemesitumoh41@gmail.com'
  )
);

CREATE POLICY "Admin can update withdrawal requests" 
ON withdrawal_requests 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.email = 'inemesitumoh41@gmail.com'
  )
);