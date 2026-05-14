
DROP FUNCTION IF EXISTS public.quick_ai_credit_scan(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.request_micro_loan(bigint) CASCADE;
DROP FUNCTION IF EXISTS public.request_micro_loan() CASCADE;

CREATE FUNCTION public.quick_ai_credit_scan(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_completed int := 0;
  v_rating numeric := 0;
  v_vault bigint := 0;
  v_score int := 0;
  v_max_loan bigint := 0;
  v_reason text;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Missing user');
  END IF;

  SELECT COALESCE(completed_gigs,0), COALESCE(average_rating,0), COALESCE(vault_balance,0)
    INTO v_completed, v_rating, v_vault
  FROM public.profiles WHERE id = _user_id;

  v_score := LEAST(50, v_completed * 5)
           + LEAST(30, (v_rating * 6)::int)
           + LEAST(20, (v_vault / 100000)::int);

  v_max_loan := LEAST(5000000, GREATEST(100000, v_vault * 3));

  IF v_completed < 3 THEN
    v_reason := 'Complete at least 3 gigs to unlock credit.';
  ELSIF v_rating < 4 THEN
    v_reason := 'Maintain a 4.0+ average rating to unlock credit.';
  ELSIF v_score < 32 THEN
    v_reason := 'Build more activity and savings to raise your score.';
  ELSE
    v_reason := 'You are eligible. Funds credit instantly to your wallet.';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'score', v_score,
    'completed_gigs', v_completed,
    'average_rating', v_rating,
    'vault_balance', v_vault,
    'max_loan_kobo', v_max_loan,
    'reason', v_reason
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.quick_ai_credit_scan(uuid) TO authenticated, anon;


CREATE FUNCTION public.request_micro_loan(p_amount_kobo bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_scan jsonb;
  v_max bigint;
  v_score int;
  v_loan_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF p_amount_kobo IS NULL OR p_amount_kobo < 50000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Minimum loan is N500');
  END IF;

  v_scan := public.quick_ai_credit_scan(v_uid);
  v_max := COALESCE((v_scan->>'max_loan_kobo')::bigint, 0);
  v_score := COALESCE((v_scan->>'score')::int, 0);

  IF v_score < 32
     OR COALESCE((v_scan->>'completed_gigs')::int, 0) < 3
     OR COALESCE((v_scan->>'average_rating')::numeric, 0) < 4 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not eligible yet. Keep building your reputation.');
  END IF;

  IF p_amount_kobo > v_max THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount exceeds your eligible limit.');
  END IF;

  INSERT INTO public.loans (user_id, amount_kobo, eligibility_score, status, reason)
  VALUES (v_uid, p_amount_kobo, v_score, 'disbursed', 'AI Quick Credit Scan demo loan')
  RETURNING id INTO v_loan_id;

  UPDATE public.profiles
     SET wallet_balance = COALESCE(wallet_balance,0) + p_amount_kobo
   WHERE id = v_uid;

  BEGIN
    INSERT INTO public.wallet_transactions (user_id, amount_kobo, type, status, description, reference)
    VALUES (v_uid, p_amount_kobo, 'credit', 'success',
            'Micro-loan disbursement', 'loan_' || v_loan_id::text);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object('success', true, 'loan_id', v_loan_id, 'credited_kobo', p_amount_kobo);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_micro_loan(bigint) TO authenticated;
