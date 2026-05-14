DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'wallet_topups' AND column_name = 'paystack_reference'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'wallet_topups' AND column_name = 'squad_reference'
  ) THEN
    ALTER TABLE public.wallet_topups RENAME COLUMN paystack_reference TO squad_reference;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'escrow_transactions' AND column_name = 'paystack_reference'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'escrow_transactions' AND column_name = 'squad_reference'
  ) THEN
    ALTER TABLE public.escrow_transactions RENAME COLUMN paystack_reference TO squad_reference;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'escrow_transactions' AND column_name = 'paystack_transfer_code'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'escrow_transactions' AND column_name = 'squad_transfer_code'
  ) THEN
    ALTER TABLE public.escrow_transactions RENAME COLUMN paystack_transfer_code TO squad_transfer_code;
  END IF;
END $$;