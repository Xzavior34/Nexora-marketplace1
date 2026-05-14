-- AI Poverty-Risk / Financial Distress Detection
-- Quietly analyzes a user's recent earning velocity, escrow activity, savings cadence,
-- and failed negotiations to compute a 0-100 distress score with friendly recommendations.
CREATE OR REPLACE FUNCTION public.detect_financial_distress(_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  earnings_30d           BIGINT := 0;
  earnings_prev_30d      BIGINT := 0;
  income_drop_pct        NUMERIC := 0;
  completed_30d          INT := 0;
  completed_prev_30d     INT := 0;
  work_drop_pct          NUMERIC := 0;
  escrow_30d             INT := 0;
  vault_deposits_30d     INT := 0;
  failed_apps_30d        INT := 0;
  total_apps_30d         INT := 0;
  failure_rate_pct       NUMERIC := 0;
  vault_balance_kobo     BIGINT := 0;
  wallet_balance_kobo    BIGINT := 0;
  score                  INT := 0; -- 0 = healthy, 100 = severe distress
  level                  TEXT;
  reasons                JSONB := '[]'::jsonb;
  recommendations        JSONB := '[]'::jsonb;
BEGIN
  -- Earnings: last 30d vs previous 30d (credit-type wallet transactions)
  SELECT COALESCE(SUM(amount_kobo), 0) INTO earnings_30d
    FROM public.wallet_transactions
    WHERE user_id = _user_id AND amount_kobo > 0
      AND created_at >= now() - INTERVAL '30 days';
  SELECT COALESCE(SUM(amount_kobo), 0) INTO earnings_prev_30d
    FROM public.wallet_transactions
    WHERE user_id = _user_id AND amount_kobo > 0
      AND created_at >= now() - INTERVAL '60 days'
      AND created_at <  now() - INTERVAL '30 days';

  IF earnings_prev_30d > 0 THEN
    income_drop_pct := GREATEST(0, ((earnings_prev_30d - earnings_30d)::NUMERIC / earnings_prev_30d) * 100);
  END IF;

  -- Work frequency: completed gigs as worker
  SELECT COUNT(*) INTO completed_30d FROM public.tasks
    WHERE assignee_id = _user_id AND status = 'completed'
      AND updated_at >= now() - INTERVAL '30 days';
  SELECT COUNT(*) INTO completed_prev_30d FROM public.tasks
    WHERE assignee_id = _user_id AND status = 'completed'
      AND updated_at >= now() - INTERVAL '60 days'
      AND updated_at <  now() - INTERVAL '30 days';
  IF completed_prev_30d > 0 THEN
    work_drop_pct := GREATEST(0, ((completed_prev_30d - completed_30d)::NUMERIC / completed_prev_30d) * 100);
  END IF;

  -- Escrow activity (paid OR received)
  SELECT COUNT(*) INTO escrow_30d FROM public.escrow_transactions
    WHERE (payer_id = _user_id OR payee_id = _user_id)
      AND created_at >= now() - INTERVAL '30 days';

  -- Vault saving cadence (deposits)
  SELECT COUNT(*) INTO vault_deposits_30d FROM public.wallet_transactions
    WHERE user_id = _user_id
      AND created_at >= now() - INTERVAL '30 days'
      AND COALESCE(description, '') ILIKE '%vault%';

  -- Failed negotiations: rejected applications
  SELECT COUNT(*) INTO failed_apps_30d FROM public.task_applications
    WHERE applicant_id = _user_id AND status = 'rejected'
      AND created_at >= now() - INTERVAL '30 days';
  SELECT COUNT(*) INTO total_apps_30d FROM public.task_applications
    WHERE applicant_id = _user_id
      AND created_at >= now() - INTERVAL '30 days';
  IF total_apps_30d > 0 THEN
    failure_rate_pct := (failed_apps_30d::NUMERIC / total_apps_30d) * 100;
  END IF;

  -- Balances
  SELECT COALESCE(vault_balance, 0), COALESCE(wallet_balance, 0)
    INTO vault_balance_kobo, wallet_balance_kobo
    FROM public.profiles WHERE id = _user_id;

  -- Score weights (sum capped 100)
  IF income_drop_pct >= 70 THEN score := score + 35;
    reasons := reasons || jsonb_build_array('Income dropped sharply this month');
  ELSIF income_drop_pct >= 40 THEN score := score + 22;
    reasons := reasons || jsonb_build_array('Income is trending down');
  END IF;

  IF work_drop_pct >= 60 THEN score := score + 20;
    reasons := reasons || jsonb_build_array('Completed gigs collapsed this month');
  ELSIF work_drop_pct >= 30 THEN score := score + 10;
    reasons := reasons || jsonb_build_array('Fewer completed gigs than usual');
  END IF;

  IF escrow_30d = 0 THEN score := score + 12;
    reasons := reasons || jsonb_build_array('No escrow activity in 30 days');
  END IF;

  IF vault_deposits_30d = 0 AND vault_balance_kobo < 100000 THEN score := score + 10;
    reasons := reasons || jsonb_build_array('No savings buffer');
  END IF;

  IF failure_rate_pct >= 70 AND total_apps_30d >= 3 THEN score := score + 15;
    reasons := reasons || jsonb_build_array('Most recent applications were rejected');
  END IF;

  IF wallet_balance_kobo < 50000 AND vault_balance_kobo < 50000 THEN
    score := score + 8;
  END IF;

  score := LEAST(100, score);

  IF score >= 70 THEN level := 'critical';
  ELSIF score >= 45 THEN level := 'elevated';
  ELSIF score >= 20 THEN level := 'watch';
  ELSE level := 'healthy';
  END IF;

  -- Recommendations
  IF level <> 'healthy' THEN
    IF income_drop_pct >= 40 OR completed_30d < completed_prev_30d THEN
      recommendations := recommendations || jsonb_build_array(
        jsonb_build_object('type','find_gigs','title','Browse fresh gigs near you','action','/gigs')
      );
    END IF;
    IF vault_balance_kobo < 200000 THEN
      recommendations := recommendations || jsonb_build_array(
        jsonb_build_object('type','protect_savings','title','Lower auto-save to protect your wallet','action','vault')
      );
    END IF;
    IF level IN ('elevated','critical') THEN
      recommendations := recommendations || jsonb_build_array(
        jsonb_build_object('type','flexible_loan','title','Request a flexible micro-loan with relaxed repayment','action','loan')
      );
    END IF;
    IF failure_rate_pct >= 50 THEN
      recommendations := recommendations || jsonb_build_array(
        jsonb_build_object('type','improve_profile','title','Polish your profile to win more bids','action','/profile')
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'score', score,
    'level', level,
    'reasons', reasons,
    'recommendations', recommendations,
    'metrics', jsonb_build_object(
      'earnings_30d_kobo', earnings_30d,
      'earnings_prev_30d_kobo', earnings_prev_30d,
      'income_drop_pct', ROUND(income_drop_pct, 1),
      'completed_30d', completed_30d,
      'completed_prev_30d', completed_prev_30d,
      'work_drop_pct', ROUND(work_drop_pct, 1),
      'escrow_30d', escrow_30d,
      'vault_deposits_30d', vault_deposits_30d,
      'failure_rate_pct', ROUND(failure_rate_pct, 1),
      'vault_balance_kobo', vault_balance_kobo,
      'wallet_balance_kobo', wallet_balance_kobo
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.detect_financial_distress(UUID) TO authenticated;