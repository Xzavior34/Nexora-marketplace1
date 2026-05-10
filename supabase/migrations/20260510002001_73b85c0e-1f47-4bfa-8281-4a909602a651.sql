
CREATE OR REPLACE FUNCTION public.auto_skim_to_vault_on_release()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_worker UUID;
  v_pct INT;
  v_skim BIGINT;
  v_wallet BIGINT;
  v_vault BIGINT;
BEGIN
  IF NEW.status <> 'released' OR OLD.status = 'released' THEN
    RETURN NEW;
  END IF;
  v_worker := COALESCE(NEW.worker_id, NEW.payee_id);
  IF v_worker IS NULL OR NEW.amount_kobo IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT auto_save_percentage, wallet_balance, vault_balance
    INTO v_pct, v_wallet, v_vault
  FROM profiles WHERE id = v_worker FOR UPDATE;

  IF COALESCE(v_pct, 0) <= 0 THEN
    RETURN NEW;
  END IF;

  v_skim := FLOOR(NEW.amount_kobo * v_pct / 100);
  IF v_skim <= 0 OR v_wallet < v_skim THEN
    RETURN NEW;
  END IF;

  UPDATE profiles
  SET wallet_balance = v_wallet - v_skim,
      vault_balance  = COALESCE(v_vault, 0) + v_skim,
      updated_at = now()
  WHERE id = v_worker;

  INSERT INTO wallet_transactions (user_id, type, amount_kobo, balance_after_kobo, description, reference)
  VALUES (v_worker, 'withdrawal', v_skim, v_wallet - v_skim,
          'AjoSquad Auto-Save (' || v_pct || '% of gig payout)',
          'AUTO_VAULT_' || NEW.id::text);

  INSERT INTO notifications (user_id, title, body, data)
  VALUES (v_worker, 'Auto-Saved to Vault',
          'N' || (v_skim / 100)::text || ' (' || v_pct || '%) moved into your AjoSquad Vault.',
          jsonb_build_object('type', 'vault_auto_save', 'amount_kobo', v_skim));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_skim_to_vault ON public.escrow_transactions;
CREATE TRIGGER trg_auto_skim_to_vault
AFTER UPDATE OF status ON public.escrow_transactions
FOR EACH ROW
EXECUTE FUNCTION public.auto_skim_to_vault_on_release();
