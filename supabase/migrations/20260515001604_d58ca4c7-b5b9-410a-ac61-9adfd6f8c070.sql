-- Nexora production hardening: Squad deposits, wallet ledger, RPC ambiguity, observability

-- 1) Ensure transaction references are unique when present for idempotency.
CREATE UNIQUE INDEX IF NOT EXISTS wallet_transactions_reference_unique
ON public.wallet_transactions (reference)
WHERE reference IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS escrow_transactions_squad_reference_unique
ON public.escrow_transactions (squad_reference)
WHERE squad_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_created
ON public.wallet_transactions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_topups_user_created
ON public.wallet_topups (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_escrow_transactions_participants_created
ON public.escrow_transactions (payer_id, payee_id, created_at DESC);

-- 2) Centralized immutable-ish request trace table for backend observability.
CREATE TABLE IF NOT EXISTS public.system_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  request_id text,
  severity text NOT NULL DEFAULT 'info',
  event_type text NOT NULL,
  duration_ms integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS system_activity_admin_read ON public.system_activity_log;
CREATE POLICY system_activity_admin_read
ON public.system_activity_log
FOR SELECT
TO authenticated
USING (lower(auth.jwt() ->> 'email') = 'unigig60@gmail.com');

DROP POLICY IF EXISTS system_activity_service_all ON public.system_activity_log;
CREATE POLICY system_activity_service_all
ON public.system_activity_log
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_system_activity_log_created
ON public.system_activity_log (created_at DESC);

-- 3) Replace outdated Paystack wording in transaction guard, keeping the same security behavior.
CREATE OR REPLACE FUNCTION public.strict_transaction_lockdown()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('request.jwt.claim.role', true) IN ('authenticated', 'anon')
     OR current_user IN ('authenticated', 'anon') THEN
    IF NEW.status IN ('success', 'released', 'held') THEN
      RAISE EXCEPTION 'FINTECH LOCK: Only secure Squad backend functions can approve money.';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 4) Remove ambiguity in get_smart_matches by qualifying every table/variable reference.
CREATE OR REPLACE FUNCTION public.get_smart_matches(_user_id uuid, _limit integer DEFAULT 12)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  category text,
  price_kobo bigint,
  location text,
  deadline timestamptz,
  created_at timestamptz,
  poster_id uuid,
  poster_name text,
  poster_avatar text,
  poster_university text,
  match_score integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_skills text[];
  v_university text;
BEGIN
  SELECT COALESCE(pr.skills, '{}'::text[]), pr.university
    INTO v_skills, v_university
  FROM public.profiles AS pr
  WHERE pr.id = _user_id;

  RETURN QUERY
  SELECT
    t.id AS id,
    t.title AS title,
    t.description AS description,
    t.category AS category,
    t.price_kobo AS price_kobo,
    t.location AS location,
    t.deadline AS deadline,
    t.created_at AS created_at,
    t.poster_id AS poster_id,
    p.full_name AS poster_name,
    p.avatar_url AS poster_avatar,
    p.university AS poster_university,
    (
      LEAST(
        60,
        CASE
          WHEN COALESCE(array_length(v_skills, 1), 0) = 0 THEN 25
          ELSE (
            SELECT COUNT(*)::integer
            FROM unnest(v_skills) AS skill(term)
            WHERE position(lower(skill.term) IN lower(COALESCE(t.title, '') || ' ' || COALESCE(t.description, '') || ' ' || COALESCE(t.category, ''))) > 0
          ) * 60 / GREATEST(array_length(v_skills, 1), 1)
        END
      )
      + CASE
          WHEN v_university IS NOT NULL AND p.university = v_university THEN 25
          WHEN v_university IS NOT NULL AND p.university IS NOT NULL THEN 10
          ELSE 8
        END
      + CASE
          WHEN t.created_at > now() - interval '24 hours' THEN 15
          WHEN t.created_at > now() - interval '3 days' THEN 10
          WHEN t.created_at > now() - interval '7 days' THEN 6
          ELSE 2
        END
    )::integer AS match_score
  FROM public.tasks AS t
  JOIN public.profiles AS p ON p.id = t.poster_id
  WHERE t.status = 'open'::public.task_status
    AND t.poster_id <> _user_id
  ORDER BY match_score DESC, t.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 12), 50));
END;
$function$;

REVOKE ALL ON FUNCTION public.get_smart_matches(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_smart_matches(uuid, integer) TO authenticated;

-- 5) Atomic, idempotent Squad wallet credit. Used by webhooks and any trusted backend settlement path.
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

  IF FOUND THEN
    v_user_id := v_topup.user_id;
    v_amount_kobo := v_topup.amount_kobo;
  ELSE
    v_user_id := p_user_id;
    v_amount_kobo := p_amount_kobo;
  END IF;

  IF v_user_id IS NULL OR v_amount_kobo IS NULL OR v_amount_kobo <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Missing user or amount for settlement', 'error_code', 'BAD_SETTLEMENT');
  END IF;

  PERFORM 1 FROM public.profiles AS pr WHERE pr.id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Profile not found', 'error_code', 'PROFILE_NOT_FOUND');
  END IF;

  UPDATE public.profiles AS pr
     SET wallet_balance = COALESCE(pr.wallet_balance, 0) + v_amount_kobo,
         updated_at = now()
   WHERE pr.id = v_user_id
   RETURNING pr.wallet_balance INTO v_new_balance;

  INSERT INTO public.wallet_transactions
    (user_id, type, amount_kobo, balance_after_kobo, reference, status, description)
  VALUES
    (v_user_id, 'deposit'::public.transaction_type, v_amount_kobo, v_new_balance, p_reference, 'success',
     CASE WHEN p_source = 'virtual_account' THEN 'Squad virtual account deposit' ELSE 'Squad wallet deposit' END)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_existing_tx;

  IF v_existing_tx IS NULL THEN
    -- A concurrent worker inserted the same reference. Roll back the balance increment in this transaction path.
    UPDATE public.profiles AS pr
       SET wallet_balance = pr.wallet_balance - v_amount_kobo,
           updated_at = now()
     WHERE pr.id = v_user_id
     RETURNING pr.wallet_balance INTO v_new_balance;

    SELECT wt.id INTO v_existing_tx
    FROM public.wallet_transactions AS wt
    WHERE wt.reference = p_reference
      AND wt.type = 'deposit'::public.transaction_type
      AND wt.status = 'success'
    LIMIT 1;

    RETURN json_build_object('success', true, 'idempotent', true, 'transaction_id', v_existing_tx, 'balance_after_kobo', v_new_balance);
  END IF;

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

REVOKE ALL ON FUNCTION public.process_squad_wallet_credit(text, uuid, bigint, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_squad_wallet_credit(text, uuid, bigint, text, jsonb) TO service_role;

-- 6) Harden older helper name so any legacy backend caller is still idempotent and safe.
CREATE OR REPLACE FUNCTION public.handle_squad_deposit(p_user_id uuid, p_amount_kobo bigint, p_reference text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN public.process_squad_wallet_credit(
    p_reference => p_reference,
    p_user_id => p_user_id,
    p_amount_kobo => p_amount_kobo,
    p_source => 'legacy_squad_deposit',
    p_metadata => '{}'::jsonb
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.handle_squad_deposit(uuid, bigint, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_squad_deposit(uuid, bigint, text) TO service_role;

-- 7) Replace unsafe demo withdrawal behavior: never auto-inject wallet funds.
CREATE OR REPLACE FUNCTION public.initiate_manual_withdrawal(
  p_amount_kobo bigint,
  p_bank_name text,
  p_account_number text,
  p_account_name text
)
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
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentication strictly required.', 'error_code', 'UNAUTHENTICATED');
  END IF;

  IF p_amount_kobo IS NULL OR p_amount_kobo < 10000 THEN
    RETURN json_build_object('success', false, 'error', 'Minimum withdrawal is ₦100.', 'error_code', 'MIN_AMOUNT');
  END IF;

  IF p_bank_name IS NULL OR length(trim(p_bank_name)) < 2
     OR p_account_number IS NULL OR p_account_number !~ '^[0-9]{10}$'
     OR p_account_name IS NULL OR length(trim(p_account_name)) < 2 THEN
    RETURN json_build_object('success', false, 'error', 'Verified bank details are required.', 'error_code', 'BAD_BANK_DETAILS');
  END IF;

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
         account_name = trim(p_account_name),
         updated_at = now()
   WHERE pr.id = v_user_id
   RETURNING pr.wallet_balance INTO v_new_balance;

  INSERT INTO public.withdrawal_requests (user_id, amount_kobo, bank_name, account_number, account_name, status)
  VALUES (v_user_id, p_amount_kobo, trim(p_bank_name), trim(p_account_number), trim(p_account_name), 'pending')
  RETURNING id INTO v_request_id;

  INSERT INTO public.wallet_transactions
    (user_id, type, amount_kobo, balance_after_kobo, description, reference, status)
  VALUES
    (v_user_id, 'withdrawal'::public.transaction_type, p_amount_kobo, v_new_balance, 'Withdrawal request pending review', 'WD_' || v_request_id::text, 'pending');

  RETURN json_build_object('success', true, 'request_id', v_request_id, 'new_balance', v_new_balance);
END;
$function$;

REVOKE ALL ON FUNCTION public.initiate_manual_withdrawal(bigint, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.initiate_manual_withdrawal(bigint, text, text, text) TO authenticated;