-- Fix wallet transactions reference constraint to allow proper ON CONFLICT DO NOTHING

DROP INDEX IF EXISTS public.wallet_transactions_reference_unique;

-- Safe creation of unique constraint (will fail if duplicates exist, which is intended)
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_reference_key UNIQUE (reference);

CREATE OR REPLACE FUNCTION public.process_squad_wallet_credit(
  p_reference text,
  p_user_id uuid DEFAULT NULL,
  p_amount_kobo bigint DEFAULT NULL,
  p_source text DEFAULT 'squad_webhook',
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_topup public.wallet_topups%ROWTYPE;
  v_user_id uuid;
  v_amount_kobo bigint;
  v_new_balance bigint;
  v_existing_tx uuid;
BEGIN
  IF p_reference IS NULL OR length(trim(p_reference)) < 8 THEN
    RETURN json_build_object('success', false, 'error', 'Invalid payment reference', 'error_code', 'BAD_REFERENCE');
  END IF;

  SELECT wt.id INTO v_existing_tx
  FROM public.wallet_transactions AS wt
  WHERE wt.reference = p_reference
    AND wt.type = 'deposit'::public.transaction_type
    AND wt.status = 'success'
  LIMIT 1;

  IF v_existing_tx IS NOT NULL THEN
    RETURN json_build_object('success', true, 'idempotent', true, 'transaction_id', v_existing_tx);
  END IF;

  SELECT * INTO v_topup
  FROM public.wallet_topups AS wtu
  WHERE wtu.squad_reference = p_reference
  FOR UPDATE;

  -- 1) Deterministic Identity Resolution (NO GUESSING)
  IF NOT FOUND THEN
    IF p_source = 'virtual_account' THEN
      v_user_id := p_user_id;
      v_amount_kobo := p_amount_kobo;
    ELSE
      RETURN json_build_object('success', false, 'error', 'Wallet topup intention not found', 'error_code', 'ORPHANED_WEBHOOK');
    END IF;
  ELSE
    v_user_id := v_topup.user_id;
    -- 2) Strict Amount Validation (NO OVERRIDES)
    IF p_amount_kobo IS NOT NULL AND p_amount_kobo != v_topup.amount_kobo THEN
      RETURN json_build_object('success', false, 'error', 'Webhook amount mismatch', 'error_code', 'AMOUNT_MISMATCH');
    END IF;
    v_amount_kobo := v_topup.amount_kobo;
  END IF;

  IF v_user_id IS NULL OR v_amount_kobo IS NULL OR v_amount_kobo <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Missing user or amount for settlement', 'error_code', 'BAD_SETTLEMENT');
  END IF;

  PERFORM 1 FROM public.profiles AS pr WHERE pr.id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Profile not found', 'error_code', 'PROFILE_NOT_FOUND');
  END IF;

  -- 1) Attempt to insert the unique transaction first. This acts as our idempotency lock.
  INSERT INTO public.wallet_transactions
    (user_id, type, amount_kobo, balance_after_kobo, reference, status, description)
  VALUES
    (v_user_id, 'deposit'::public.transaction_type, v_amount_kobo, 0, p_reference, 'success',
     CASE WHEN p_source = 'virtual_account' THEN 'Squad virtual account deposit' ELSE 'Squad wallet deposit' END)
  ON CONFLICT (reference) DO NOTHING
  RETURNING id INTO v_existing_tx;

  -- 2) If the insert returned nothing, the transaction already exists. Idempotent return.
  IF v_existing_tx IS NULL THEN
    SELECT wt.id INTO v_existing_tx
    FROM public.wallet_transactions AS wt
    WHERE wt.reference = p_reference
      AND wt.type = 'deposit'::public.transaction_type
      AND wt.status = 'success'
    LIMIT 1;

    -- We don't have the exact new balance readily available here, but we can safely return.
    RETURN json_build_object('success', true, 'idempotent', true, 'transaction_id', v_existing_tx);
  END IF;

  -- 3) Since we successfully inserted the unique transaction, we are safe to credit the wallet.
  UPDATE public.profiles AS pr
     SET wallet_balance = COALESCE(pr.wallet_balance, 0) + v_amount_kobo,
         updated_at = now()
   WHERE pr.id = v_user_id
   RETURNING pr.wallet_balance INTO v_new_balance;

  -- 4) Update the transaction with the correct balance snapshot
  UPDATE public.wallet_transactions
     SET balance_after_kobo = v_new_balance
   WHERE id = v_existing_tx;

  IF FOUND THEN
    UPDATE public.wallet_topups AS wtu
       SET status = 'success', transaction_status = 'success'
     WHERE wtu.id = v_topup.id;
  END IF;

  INSERT INTO public.system_activity_log (source, request_id, severity, event_type, metadata)
  VALUES ('wallet', p_reference, 'info', 'wallet_credit_success', jsonb_build_object(
    'user_id', v_user_id,
    'amount_kobo', v_amount_kobo,
    'source', p_source,
    'metadata', p_metadata
  ));

  RETURN json_build_object('success', true, 'idempotent', false, 'transaction_id', v_existing_tx, 'balance_after_kobo', v_new_balance);
EXCEPTION
  WHEN unique_violation THEN
    SELECT wt.id INTO v_existing_tx
    FROM public.wallet_transactions AS wt
    WHERE wt.reference = p_reference
      AND wt.type = 'deposit'::public.transaction_type
      AND wt.status = 'success'
    LIMIT 1;
    RETURN json_build_object('success', true, 'idempotent', true, 'transaction_id', v_existing_tx);
  WHEN OTHERS THEN
    INSERT INTO public.system_activity_log (source, request_id, severity, event_type, metadata)
    VALUES ('wallet', p_reference, 'error', 'wallet_credit_failed', jsonb_build_object('message', SQLERRM, 'state', SQLSTATE));
    RAISE;
END;
$function$;
