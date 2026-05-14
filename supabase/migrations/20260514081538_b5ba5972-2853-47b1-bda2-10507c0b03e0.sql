CREATE TABLE IF NOT EXISTS public.loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount_kobo BIGINT NOT NULL,
  eligibility_score INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'approved',
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "loans_self_read" ON public.loans;
CREATE POLICY "loans_self_read"
ON public.loans
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR lower(auth.jwt() ->> 'email') = 'unigig60@gmail.com');

DROP POLICY IF EXISTS "loans_self_insert" ON public.loans;
CREATE POLICY "loans_self_insert"
ON public.loans
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "loans_admin_all" ON public.loans;
CREATE POLICY "loans_admin_all"
ON public.loans
FOR ALL
TO authenticated
USING (lower(auth.jwt() ->> 'email') = 'unigig60@gmail.com')
WITH CHECK (lower(auth.jwt() ->> 'email') = 'unigig60@gmail.com');

CREATE INDEX IF NOT EXISTS idx_loans_user_created ON public.loans(user_id, created_at DESC);

DROP TRIGGER IF EXISTS update_loans_updated_at ON public.loans;
CREATE TRIGGER update_loans_updated_at
BEFORE UPDATE ON public.loans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.quick_ai_credit_scan(_user_id UUID DEFAULT auth.uid())
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_completed INTEGER := 0;
  v_rating NUMERIC := 0;
  v_score INTEGER := 0;
  v_max_loan BIGINT := 0;
  v_eligible BOOLEAN := false;
BEGIN
  IF auth.uid() IS NULL OR _user_id IS DISTINCT FROM auth.uid() THEN
    RETURN json_build_object('success', false, 'eligible', false, 'error', 'Unauthorized', 'score', 0);
  END IF;

  SELECT COALESCE(completed_gigs, 0), COALESCE(average_rating, 0)
    INTO v_completed, v_rating
  FROM public.profiles
  WHERE id = _user_id;

  v_score := LEAST(100, (LEAST(v_completed, 20) * 4) + LEAST(20, GREATEST(0, ROUND(v_rating * 4)::INTEGER)));
  v_eligible := v_completed >= 3 AND v_rating >= 4.0;
  v_max_loan := CASE
    WHEN NOT v_eligible THEN 0
    ELSE LEAST(5000000, GREATEST(50000, (v_completed * 100000) + ROUND(v_rating * 200000)::BIGINT))
  END;

  RETURN json_build_object(
    'success', true,
    'eligible', v_eligible,
    'score', v_score,
    'completed_gigs', v_completed,
    'average_rating', v_rating,
    'max_loan_kobo', v_max_loan,
    'reason', CASE WHEN v_eligible THEN 'Eligible based on completed gigs and rating' ELSE 'Complete 3+ gigs with a 4.0+ average rating to qualify' END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.request_micro_loan(p_amount_kobo BIGINT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_wallet BIGINT := 0;
  v_scan json;
  v_eligible BOOLEAN := false;
  v_score INTEGER := 0;
  v_max_loan BIGINT := 0;
  v_loan_id UUID;
BEGIN
  IF v_user IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized', 'error_code', 'UNAUTHENTICATED');
  END IF;

  IF p_amount_kobo IS NULL OR p_amount_kobo < 50000 THEN
    RETURN json_build_object('success', false, 'error', 'Minimum loan is ₦500', 'error_code', 'BAD_AMOUNT');
  END IF;

  v_scan := public.quick_ai_credit_scan(v_user);
  v_eligible := COALESCE((v_scan ->> 'eligible')::BOOLEAN, false);
  v_score := COALESCE((v_scan ->> 'score')::INTEGER, 0);
  v_max_loan := COALESCE((v_scan ->> 'max_loan_kobo')::BIGINT, 0);

  IF NOT v_eligible THEN
    RETURN json_build_object('success', false, 'error', v_scan ->> 'reason', 'error_code', 'NOT_ELIGIBLE', 'scan', v_scan);
  END IF;

  IF p_amount_kobo > v_max_loan THEN
    RETURN json_build_object('success', false, 'error', 'Amount exceeds approved limit', 'error_code', 'LIMIT_EXCEEDED', 'max_loan_kobo', v_max_loan, 'scan', v_scan);
  END IF;

  SELECT wallet_balance INTO v_wallet
  FROM public.profiles
  WHERE id = v_user
  FOR UPDATE;

  INSERT INTO public.loans (user_id, amount_kobo, eligibility_score, status, reason)
  VALUES (v_user, p_amount_kobo, v_score, 'approved', 'Demo loan approved by Quick AI Credit Scan')
  RETURNING id INTO v_loan_id;

  UPDATE public.profiles
  SET wallet_balance = v_wallet + p_amount_kobo,
      updated_at = now()
  WHERE id = v_user;

  INSERT INTO public.wallet_transactions (user_id, type, amount_kobo, balance_after_kobo, description, reference, status)
  VALUES (v_user, 'deposit'::transaction_type, p_amount_kobo, v_wallet + p_amount_kobo,
          'Quick AI Credit Scan demo loan disbursed via Squad wallet', 'LOAN_' || v_loan_id::text, 'success');

  INSERT INTO public.notifications (user_id, title, body, data)
  VALUES (v_user, 'Loan approved',
          '₦' || trim(to_char(p_amount_kobo / 100.0, 'FM999G999G999G990')) || ' has been credited to your wallet.',
          jsonb_build_object('type', 'micro_loan', 'loan_id', v_loan_id, 'amount_kobo', p_amount_kobo));

  RETURN json_build_object('success', true, 'loan_id', v_loan_id, 'amount_kobo', p_amount_kobo, 'new_wallet', v_wallet + p_amount_kobo, 'scan', v_scan);
END;
$$;

REVOKE ALL ON FUNCTION public.quick_ai_credit_scan(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.request_micro_loan(BIGINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.quick_ai_credit_scan(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_micro_loan(BIGINT) TO authenticated;