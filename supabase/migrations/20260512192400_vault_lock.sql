ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vault_locked_until TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Override vault_withdraw
CREATE OR REPLACE FUNCTION public.vault_withdraw(p_amount_kobo BIGINT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_vault_bal bigint;
  v_locked_until timestamp with time zone;
BEGIN
  v_user := auth.uid();
  IF v_user IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT vault_balance, vault_locked_until INTO v_vault_bal, v_locked_until
  FROM public.profiles WHERE id = v_user FOR UPDATE;

  IF v_locked_until IS NOT NULL AND v_locked_until > CURRENT_TIMESTAMP THEN
    RETURN json_build_object('success', false, 'error', 'Vault is locked until ' || to_char(v_locked_until, 'YYYY-MM-DD HH24:MI'));
  END IF;

  IF p_amount_kobo <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Invalid amount');
  END IF;
  
  IF v_vault_bal < p_amount_kobo THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient vault balance');
  END IF;

  UPDATE public.profiles
  SET vault_balance = vault_balance - p_amount_kobo,
      wallet_balance = wallet_balance + p_amount_kobo
  WHERE id = v_user;

  INSERT INTO public.transactions (user_id, amount_kobo, type, status, description, reference)
  VALUES (v_user, p_amount_kobo, 'transfer', 'success', 
          'AjoSquad Vault withdrawal', 'VAULT_WD_' || gen_random_uuid()::text);

  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.vault_withdraw(BIGINT) TO authenticated;

-- Create vault_lock RPC
CREATE OR REPLACE FUNCTION public.vault_lock(p_lock_days INTEGER)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_new_date timestamp with time zone;
BEGIN
  v_user := auth.uid();
  IF v_user IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  
  IF p_lock_days <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Lock days must be positive');
  END IF;

  v_new_date := CURRENT_TIMESTAMP + (p_lock_days || ' days')::interval;

  UPDATE public.profiles
  SET vault_locked_until = v_new_date
  WHERE id = v_user;

  RETURN json_build_object('success', true, 'locked_until', v_new_date);
END;
$$;

GRANT EXECUTE ON FUNCTION public.vault_lock(INTEGER) TO authenticated;
