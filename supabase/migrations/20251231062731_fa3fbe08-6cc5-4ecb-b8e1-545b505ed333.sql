-- Create verification_tokens table for double opt-in email verification
CREATE TABLE IF NOT EXISTS public.verification_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Enable RLS - only system can access
ALTER TABLE public.verification_tokens ENABLE ROW LEVEL SECURITY;

-- No public policies - only service role can access
-- This is intentional for security

-- Add index for faster token lookups
CREATE INDEX idx_verification_tokens_token ON public.verification_tokens(token);
CREATE INDEX idx_verification_tokens_user_id ON public.verification_tokens(user_id);

-- Update process_withdrawal function to apply 10% fee only on withdrawals
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
  v_fee_kobo BIGINT;
  v_payout_kobo BIGINT;
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
  
  -- Calculate 10% fee on withdrawal
  v_fee_kobo := FLOOR(p_amount_kobo * 0.10);
  v_payout_kobo := p_amount_kobo - v_fee_kobo;
  
  -- Calculate new balance (deduct full amount including fee)
  v_new_balance := v_current_balance - p_amount_kobo;
  
  -- Deduct from wallet (atomic operation)
  UPDATE profiles
  SET wallet_balance = v_new_balance,
      updated_at = now()
  WHERE id = p_user_id;
  
  -- Create withdrawal request (store net payout amount)
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
    v_payout_kobo, -- User receives this amount (after 10% fee)
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
    'Withdrawal to ' || p_bank_name || ' - ' || p_account_number || ' (10% fee: ₦' || (v_fee_kobo / 100)::TEXT || ')',
    'WD_' || v_request_id::TEXT
  );
  
  -- Log the 10% platform fee
  INSERT INTO admin_fees (
    transaction_type,
    source_user_id,
    amount_kobo,
    reference,
    admin_account,
    status
  )
  VALUES (
    'withdrawal',
    p_user_id,
    v_fee_kobo,
    'WD_' || v_request_id::TEXT,
    '9064513390',
    'collected'
  );
  
  RETURN json_build_object(
    'success', true,
    'request_id', v_request_id,
    'new_balance', v_new_balance,
    'fee_kobo', v_fee_kobo,
    'payout_kobo', v_payout_kobo
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;