
-- Escrow state change audit log
CREATE TABLE IF NOT EXISTS public.escrow_state_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_id UUID NOT NULL,
  task_id UUID,
  payer_id UUID,
  payee_id UUID,
  old_status TEXT,
  new_status TEXT NOT NULL,
  amount_kobo BIGINT,
  wallet_transaction_id UUID,
  reference TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_escrow_state_log_escrow ON public.escrow_state_log(escrow_id);
CREATE INDEX IF NOT EXISTS idx_escrow_state_log_changed_at ON public.escrow_state_log(changed_at DESC);

ALTER TABLE public.escrow_state_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS escrow_state_log_admin_read ON public.escrow_state_log;
CREATE POLICY escrow_state_log_admin_read ON public.escrow_state_log
  FOR SELECT TO authenticated
  USING (lower((auth.jwt() ->> 'email')) = 'unigig60@gmail.com');

DROP POLICY IF EXISTS escrow_state_log_service ON public.escrow_state_log;
CREATE POLICY escrow_state_log_service ON public.escrow_state_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Trigger to auto-record state changes on escrow_transactions
CREATE OR REPLACE FUNCTION public.log_escrow_state_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_tx UUID;
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status) THEN
    SELECT id INTO last_tx
    FROM public.wallet_transactions
    WHERE escrow_id = NEW.id
    ORDER BY created_at DESC
    LIMIT 1;

    INSERT INTO public.escrow_state_log (
      escrow_id, task_id, payer_id, payee_id,
      old_status, new_status, amount_kobo,
      wallet_transaction_id, reference
    ) VALUES (
      NEW.id, NEW.task_id, NEW.payer_id, NEW.payee_id,
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.status::TEXT ELSE NULL END,
      NEW.status::TEXT, NEW.amount_kobo,
      last_tx, NEW.squad_reference
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_escrow_state_change ON public.escrow_transactions;
CREATE TRIGGER trg_log_escrow_state_change
AFTER INSERT OR UPDATE ON public.escrow_transactions
FOR EACH ROW EXECUTE FUNCTION public.log_escrow_state_change();
