CREATE OR REPLACE FUNCTION public.initiate_manual_withdrawal(p_amount_kobo bigint, p_bank_name text, p_account_number text, p_account_name text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_wallet bigint;
  v_new_balance bigint;
  v_request_id uuid;
  v_account_name text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentication strictly required.', 'error_code', 'UNAUTHENTICATED');
  END IF;

  IF p_amount_kobo IS NULL OR p_amount_kobo < 10000 THEN
    RETURN json_build_object('success', false, 'error', 'Minimum withdrawal is N100.', 'error_code', 'MIN_AMOUNT');
  END IF;

  -- Bank name and 10-digit account number are required; account name optional (admin will verify on payout)
  IF p_bank_name IS NULL OR length(trim(p_bank_name)) < 2
     OR p_account_number IS NULL OR p_account_number !~ '^[0-9]{10}$' THEN
    RETURN json_build_object('success', false, 'error', 'Please enter a valid bank and 10-digit account number.', 'error_code', 'BAD_BANK_DETAILS');
  END IF;

  v_account_name := COALESCE(NULLIF(trim(p_account_name), ''), 'Pending Verification');

  SELECT pr.wallet_balance INTO v_wallet
  FROM public.profiles AS pr
  WHERE pr.id = v_user_id
  FOR UPDATE;

  IF v_wallet IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Profile not found.', 'error_code', 'PROFILE_NOT_FOUND');
  END IF;

  IF v_wallet < p_amount_kobo THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient wallet balance.', 'error_code', 'INSUFFICIENT_FUNDS');
  END IF;

  UPDATE public.profiles AS pr
     SET wallet_balance = pr.wallet_balance - p_amount_kobo,
         bank_name = trim(p_bank_name),
         account_number = trim(p_account_number),
         account_name = v_account_name,
         updated_at = now()
   WHERE pr.id = v_user_id
   RETURNING pr.wallet_balance INTO v_new_balance;

  INSERT INTO public.withdrawal_requests (user_id, amount_kobo, bank_name, account_number, account_name, status)
  VALUES (v_user_id, p_amount_kobo, trim(p_bank_name), trim(p_account_number), v_account_name, 'pending')
  RETURNING id INTO v_request_id;

  INSERT INTO public.wallet_transactions
    (user_id, type, amount_kobo, balance_after_kobo, description, reference, status)
  VALUES
    (v_user_id, 'withdrawal'::public.transaction_type, p_amount_kobo, v_new_balance, 'Withdrawal request pending review', 'WD_' || v_request_id::text, 'pending');

  RETURN json_build_object('success', true, 'request_id', v_request_id, 'new_balance', v_new_balance);
END;
$function$;