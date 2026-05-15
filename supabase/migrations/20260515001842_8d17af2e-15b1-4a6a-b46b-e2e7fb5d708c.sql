-- Remove legacy wallet auto-sync side effects that can double-credit balances.
DROP TRIGGER IF EXISTS tr_sync_wallet_balance ON public.wallet_transactions;

CREATE OR REPLACE FUNCTION public.sync_wallet_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Deprecated intentionally: wallet balance mutations are handled by atomic RPCs/backend functions.
  -- Keeping this function as a harmless no-op prevents old trigger references from being recreated accidentally.
  RETURN NEW;
END;
$function$;

-- Remove the unsafe legacy direct SQL payment initializer and hardcoded gateway key from live database code.
CREATE OR REPLACE FUNCTION public.instant_wallet_deposit(p_amount_kobo bigint)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN json_build_object(
    'success', false,
    'error', 'Deposits must be started from the secure Squad checkout function.',
    'error_code', 'USE_SQUAD_TOPUP_FUNCTION'
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.instant_wallet_deposit(bigint) FROM PUBLIC, anon, authenticated;