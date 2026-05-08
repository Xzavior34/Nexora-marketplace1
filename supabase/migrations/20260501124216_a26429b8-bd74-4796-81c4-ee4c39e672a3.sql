
-- =====================================================================
-- PHASE 1.A: WALLET LOCKDOWN + ADMIN AUDIT INFRASTRUCTURE
-- =====================================================================

-- 1. Drop the dangerous "Users can update own balance" policy.
-- Profile updates still work via "Profile Update" / "Allow Auth Update" policies,
-- but wallet_balance/spin_tickets/is_admin/is_verified/is_ambassador are blocked
-- by triggers below.
DROP POLICY IF EXISTS "Users can update own balance" ON public.profiles;

-- 2. Consolidate the 5 overlapping wallet-lock triggers into ONE authoritative trigger.
-- Drop all old wallet/metadata protection triggers (functions kept for safety/rollback).
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT tgname FROM pg_trigger
    WHERE tgrelid = 'public.profiles'::regclass
      AND tgname IN (
        'trg_ironclad_wallet_lock',
        'trg_strict_wallet_lockdown',
        'trg_protect_wallet_balance',
        'trg_strict_profile_wallet_lockdown',
        'trg_enforce_wallet_integrity',
        'trg_protect_sensitive_metadata',
        'trg_protect_sensitive_metadata_v2',
        'trg_smart_metadata_protection',
        'ironclad_wallet_lock',
        'strict_wallet_lockdown',
        'protect_wallet_balance',
        'strict_profile_wallet_lockdown',
        'enforce_wallet_integrity',
        'protect_sensitive_metadata',
        'protect_sensitive_metadata_v2',
        'smart_metadata_protection'
      )
  LOOP
    EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.tgname) || ' ON public.profiles';
  END LOOP;
END $$;

-- 3. ONE consolidated wallet/sensitive-field guardian.
-- Blocks frontend mutations to: wallet_balance, spin_tickets, is_admin, is_verified, is_ambassador.
-- Allows SECURITY DEFINER RPCs (which run as postgres) and service_role.
-- Also enforces non-negative balance + 500k Naira circuit breaker.
CREATE OR REPLACE FUNCTION public.profiles_guardian()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_role TEXT;
BEGIN
  v_role := current_setting('request.jwt.claim.role', true);

  -- Block wallet_balance changes from frontend
  IF NEW.wallet_balance IS DISTINCT FROM OLD.wallet_balance THEN
    IF v_role IN ('authenticated', 'anon') AND current_user NOT IN ('postgres', 'supabase_admin', 'service_role') THEN
      RAISE EXCEPTION 'VAULT SEALED: wallet_balance can only be modified by secure server functions.';
    END IF;
    -- Non-negative
    IF NEW.wallet_balance < 0 THEN
      RAISE EXCEPTION 'INTEGRITY: wallet_balance cannot be negative.';
    END IF;
    -- Circuit breaker: no single jump > 500k Naira (50,000,000 kobo)
    IF ABS(COALESCE(NEW.wallet_balance, 0) - COALESCE(OLD.wallet_balance, 0)) > 50000000 THEN
      RAISE EXCEPTION 'CIRCUIT BREAKER: Single wallet change exceeds 500,000 Naira limit.';
    END IF;
  END IF;

  -- Block spin_tickets changes from frontend
  IF NEW.spin_tickets IS DISTINCT FROM OLD.spin_tickets THEN
    IF v_role IN ('authenticated', 'anon') AND current_user NOT IN ('postgres', 'supabase_admin', 'service_role') THEN
      RAISE EXCEPTION 'VAULT SEALED: spin_tickets can only be modified by secure server functions.';
    END IF;
  END IF;

  -- Block role-flag self-promotion (is_admin, is_verified, is_ambassador)
  IF (NEW.is_admin IS DISTINCT FROM OLD.is_admin
      OR NEW.is_verified IS DISTINCT FROM OLD.is_verified
      OR NEW.is_ambassador IS DISTINCT FROM OLD.is_ambassador) THEN
    IF v_role IN ('authenticated', 'anon') AND current_user NOT IN ('postgres', 'supabase_admin', 'service_role') THEN
      RAISE EXCEPTION 'SECURITY: Account status flags cannot be modified by users.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_guardian
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profiles_guardian();

-- 4. Wallet audit log -- log EVERY wallet change for tamper-evident history.
-- Reuse existing wallet_audit_log table (already exists).
-- Keep existing log_wallet_change function but ensure trigger is attached.
DROP TRIGGER IF EXISTS trg_log_wallet_change ON public.profiles;
CREATE TRIGGER trg_log_wallet_change
AFTER UPDATE ON public.profiles
FOR EACH ROW
WHEN (OLD.wallet_balance IS DISTINCT FROM NEW.wallet_balance)
EXECUTE FUNCTION public.log_wallet_change();

-- Add transaction_id and a "source" column to wallet_audit_log for context
ALTER TABLE public.wallet_audit_log
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS actor_role TEXT;

-- Lock down wallet_audit_log: admin-read-only, no client writes.
ALTER TABLE public.wallet_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin read wallet audit" ON public.wallet_audit_log;
CREATE POLICY "Admin read wallet audit"
  ON public.wallet_audit_log FOR SELECT TO authenticated
  USING (lower(auth.jwt() ->> 'email') = 'unigig60@gmail.com');

DROP POLICY IF EXISTS "User read own wallet audit" ON public.wallet_audit_log;
CREATE POLICY "User read own wallet audit"
  ON public.wallet_audit_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================================
-- 5. ADMIN AUDIT LOG -- every admin action recorded
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,            -- e.g. 'withdrawal_approve', 'dispute_resolve', 'user_delete', 'message_send'
  target_type TEXT,                -- e.g. 'user', 'withdrawal', 'dispute', 'task', 'product'
  target_id UUID,
  before_data JSONB,
  after_data JSONB,
  metadata JSONB DEFAULT '{}'::jsonb, -- IP, notes, amount, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_admin ON public.admin_audit_log(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_target ON public.admin_audit_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON public.admin_audit_log(action, created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only the admin can read; nobody can directly write (only SECURITY DEFINER RPC).
DROP POLICY IF EXISTS "Admin read audit log" ON public.admin_audit_log;
CREATE POLICY "Admin read audit log"
  ON public.admin_audit_log FOR SELECT TO authenticated
  USING (lower(auth.jwt() ->> 'email') = 'unigig60@gmail.com');

DROP POLICY IF EXISTS "Block direct audit writes" ON public.admin_audit_log;
CREATE POLICY "Block direct audit writes"
  ON public.admin_audit_log FOR INSERT TO authenticated
  WITH CHECK (false);

-- RPC for the admin to write audit entries (validated server-side).
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action TEXT,
  p_target_type TEXT DEFAULT NULL,
  p_target_id UUID DEFAULT NULL,
  p_before JSONB DEFAULT NULL,
  p_after JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_email TEXT;
  v_admin_id UUID;
  v_log_id UUID;
BEGIN
  v_admin_id := auth.uid();
  v_admin_email := lower(auth.jwt() ->> 'email');

  IF v_admin_email IS DISTINCT FROM 'unigig60@gmail.com' THEN
    RAISE EXCEPTION 'Unauthorized: only admin can write audit log.';
  END IF;

  INSERT INTO public.admin_audit_log
    (admin_id, admin_email, action, target_type, target_id, before_data, after_data, metadata)
  VALUES
    (v_admin_id, v_admin_email, p_action, p_target_type, p_target_id, p_before, p_after, p_metadata)
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_admin_action(TEXT, TEXT, UUID, JSONB, JSONB, JSONB) TO authenticated;

-- =====================================================================
-- 6. FIX broken admin_reward_user (was checking nonexistent 'role' column)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.admin_reward_user(target_user_id UUID, reward_amount BIGINT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_email TEXT;
  v_old_balance BIGINT;
  v_new_balance BIGINT;
BEGIN
  v_admin_email := lower(auth.jwt() ->> 'email');
  IF v_admin_email IS DISTINCT FROM 'unigig60@gmail.com' THEN
    RAISE EXCEPTION 'Unauthorized: only admin can reward users.';
  END IF;

  IF reward_amount = 0 THEN
    RETURN json_build_object('success', false, 'error', 'Reward amount cannot be zero');
  END IF;

  SELECT wallet_balance INTO v_old_balance FROM profiles WHERE id = target_user_id FOR UPDATE;
  IF v_old_balance IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  v_new_balance := v_old_balance + reward_amount;
  IF v_new_balance < 0 THEN
    RETURN json_build_object('success', false, 'error', 'Cannot deduct below zero');
  END IF;

  UPDATE profiles SET wallet_balance = v_new_balance, updated_at = now() WHERE id = target_user_id;

  INSERT INTO wallet_transactions (user_id, type, amount_kobo, balance_after_kobo, description, reference)
  VALUES (
    target_user_id,
    CASE WHEN reward_amount > 0 THEN 'deposit' ELSE 'withdrawal' END,
    ABS(reward_amount),
    v_new_balance,
    'Admin adjustment',
    'ADMIN_ADJ_' || gen_random_uuid()::TEXT
  );

  -- Audit
  PERFORM public.log_admin_action(
    'wallet_adjust',
    'user',
    target_user_id,
    json_build_object('balance', v_old_balance)::jsonb,
    json_build_object('balance', v_new_balance)::jsonb,
    json_build_object('amount_kobo', reward_amount)::jsonb
  );

  RETURN json_build_object('success', true, 'old_balance', v_old_balance, 'new_balance', v_new_balance);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reward_user(UUID, BIGINT) TO authenticated;

-- =====================================================================
-- 7. SECURE SPIN WHEEL: credit wallet server-side (frontend can no longer write balance)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.secure_spin_wheel(p_user_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tickets INT;
  v_prize_index INT;
  v_prize_amount_naira INT;
  v_prize_amount_kobo BIGINT;
  v_random FLOAT;
  v_current_balance BIGINT;
  v_new_balance BIGINT;
BEGIN
  -- Caller must match
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Unauthorized spin attempt';
  END IF;

  -- Lock and check tickets
  SELECT spin_tickets, wallet_balance INTO v_tickets, v_current_balance
  FROM profiles WHERE id = p_user_id FOR UPDATE;

  IF v_tickets IS NULL OR v_tickets <= 0 THEN
    RAISE EXCEPTION 'Insufficient spin tickets';
  END IF;

  -- Deduct ticket
  UPDATE profiles SET spin_tickets = v_tickets - 1 WHERE id = p_user_id;

  -- Random prize (matches existing probability table)
  v_random := random();
  IF v_random <= 0.60 THEN
    v_prize_index := 1; v_prize_amount_naira := 0;
  ELSIF v_random <= 0.80 THEN
    v_prize_index := 2; v_prize_amount_naira := 100;
  ELSIF v_random <= 0.90 THEN
    v_prize_index := 4; v_prize_amount_naira := 200;
  ELSE
    v_prize_index := 6; v_prize_amount_naira := 300;
  END IF;

  v_prize_amount_kobo := v_prize_amount_naira * 100;

  -- Credit wallet ATOMICALLY server-side if a prize was won
  IF v_prize_amount_kobo > 0 THEN
    v_new_balance := v_current_balance + v_prize_amount_kobo;
    UPDATE profiles SET wallet_balance = v_new_balance, updated_at = now() WHERE id = p_user_id;

    INSERT INTO wallet_transactions (user_id, type, amount_kobo, balance_after_kobo, description, reference)
    VALUES (
      p_user_id, 'deposit', v_prize_amount_kobo, v_new_balance,
      'Spin to Win prize: NGN ' || v_prize_amount_naira::TEXT,
      'SPIN_' || gen_random_uuid()::TEXT
    );

    INSERT INTO notifications (user_id, title, body, data)
    VALUES (
      p_user_id, 'Prize Claimed!',
      'NGN ' || v_prize_amount_naira::TEXT || ' added to your wallet.',
      json_build_object('type', 'spin_win', 'amount_kobo', v_prize_amount_kobo)::jsonb
    );
  END IF;

  RETURN json_build_object(
    'prizeIndex', v_prize_index,
    'amount', v_prize_amount_naira,
    'credited', v_prize_amount_kobo > 0
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.secure_spin_wheel(UUID) TO authenticated;
