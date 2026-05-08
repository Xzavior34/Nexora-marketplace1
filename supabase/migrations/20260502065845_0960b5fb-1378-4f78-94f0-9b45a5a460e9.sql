
-- 1) Drop the legacy buggy overload
DROP FUNCTION IF EXISTS public.admin_reward_user(uuid, integer);

-- 2) Pin search_path on remaining functions
ALTER FUNCTION public.process_ambassador_bonus(uuid, integer) SET search_path = public;
ALTER FUNCTION public.process_ambassador_reward(uuid, integer) SET search_path = public;
ALTER FUNCTION public.process_withdrawal_request(uuid, integer, text, text, text) SET search_path = public;
ALTER FUNCTION public.protect_transaction_status() SET search_path = public;

-- 3) Revoke anon EXECUTE on every public function (then re-grant to authenticated only).
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prokind='f'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, public', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', r.sig);
  END LOOP;
END $$;

-- 4) Tighten storage: prevent anon listing for product-images/chat-attachments by removing broad SELECT
-- Keep public read by URL but block listing
DO $$
BEGIN
  -- Drop overly broad list policies if present
  EXECUTE 'DROP POLICY IF EXISTS "Public can list product images" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "Public can list chat attachments" ON storage.objects';
EXCEPTION WHEN others THEN NULL;
END $$;
