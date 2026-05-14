
-- Atomic escrow state transitions: held -> released | refunded
-- Guarantees wallet_balance updates EXACTLY ONCE via row lock + status guard
CREATE OR REPLACE FUNCTION public.release_escrow_atomic(
  p_escrow_id uuid,
  p_action text,
  p_caller uuid
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_escrow public.escrow_transactions%ROWTYPE;
  v_payee_balance bigint;
  v_payer_balance bigint;
  v_amount bigint;
BEGIN
  IF p_action NOT IN ('release','refund') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid action', 'error_code', 'BAD_ACTION');
  END IF;

  -- Lock escrow row to prevent double-spend / double-credit
  SELECT * INTO v_escrow FROM public.escrow_transactions WHERE id = p_escrow_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Escrow not found', 'error_code', 'NOT_FOUND');
  END IF;

  IF v_escrow.payer_id <> p_caller THEN
    RETURN json_build_object('success', false, 'error', 'Forbidden', 'error_code', 'FORBIDDEN');
  END IF;

  -- Strict state guard: only "held" can transition (idempotent)
  IF v_escrow.status <> 'held' THEN
    RETURN json_build_object('success', false, 'error', 'Escrow not in held state', 'error_code', 'INVALID_STATE', 'current_status', v_escrow.status);
  END IF;

  v_amount := v_escrow.amount_kobo;

  IF p_action = 'release' THEN
    UPDATE public.profiles
       SET wallet_balance = wallet_balance + v_amount,
           completed_gigs = COALESCE(completed_gigs,0) + 1
     WHERE id = v_escrow.payee_id
     RETURNING wallet_balance INTO v_payee_balance;

    UPDATE public.escrow_transactions
       SET status = 'released', released_at = now(), updated_at = now()
     WHERE id = p_escrow_id;

    UPDATE public.tasks SET status = 'completed', updated_at = now()
     WHERE id = v_escrow.task_id;

    INSERT INTO public.wallet_transactions
      (user_id, type, amount_kobo, balance_after_kobo, reference, description, escrow_id)
    VALUES
      (v_escrow.payee_id, 'escrow_release', v_amount, v_payee_balance,
       'RELEASE_' || COALESCE(v_escrow.squad_reference, p_escrow_id::text),
       'Payment released from escrow', p_escrow_id);

    RETURN json_build_object('success', true, 'action', 'released',
      'amount_kobo', v_amount, 'new_balance_kobo', v_payee_balance);
  ELSE
    UPDATE public.profiles
       SET wallet_balance = wallet_balance + v_amount
     WHERE id = v_escrow.payer_id
     RETURNING wallet_balance INTO v_payer_balance;

    UPDATE public.escrow_transactions
       SET status = 'refunded', updated_at = now()
     WHERE id = p_escrow_id;

    UPDATE public.tasks SET status = 'cancelled', updated_at = now()
     WHERE id = v_escrow.task_id;

    INSERT INTO public.wallet_transactions
      (user_id, type, amount_kobo, balance_after_kobo, reference, description, escrow_id)
    VALUES
      (v_escrow.payer_id, 'refund', v_amount, v_payer_balance,
       'REFUND_' || COALESCE(v_escrow.squad_reference, p_escrow_id::text),
       'Escrow refunded to payer', p_escrow_id);

    RETURN json_build_object('success', true, 'action', 'refunded',
      'amount_kobo', v_amount, 'new_balance_kobo', v_payer_balance);
  END IF;
END; $function$;

REVOKE ALL ON FUNCTION public.release_escrow_atomic(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_escrow_atomic(uuid, text, uuid) TO service_role;
