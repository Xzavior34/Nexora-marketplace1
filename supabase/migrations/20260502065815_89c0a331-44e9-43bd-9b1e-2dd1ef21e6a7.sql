
-- ============================================================
-- PHASE 1B: Critical Security Hardening + RLS Consolidation
-- ============================================================

-- 1) ENABLE RLS on tables that have policies but RLS off (CRITICAL)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_topups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_winners ENABLE ROW LEVEL SECURITY;

-- monthly_winners has no policies; lock it
DROP POLICY IF EXISTS "Public read winners" ON public.monthly_winners;
CREATE POLICY "Public read winners" ON public.monthly_winners FOR SELECT USING (true);

-- 2) Fix SECURITY DEFINER view -> SECURITY INVOKER
ALTER VIEW public.leaderboard_stats SET (security_invoker = true);

-- 3) Pin search_path on all SECURITY DEFINER / trigger functions
ALTER FUNCTION public.add_spin_ticket(uuid) SET search_path = public;
ALTER FUNCTION public.admin_delete_user(uuid) SET search_path = public;
ALTER FUNCTION public.admin_send_direct_message(uuid, uuid, text) SET search_path = public;
ALTER FUNCTION public.admin_send_inbox_message(uuid, uuid, text) SET search_path = public;
ALTER FUNCTION public.admin_send_message_bypass(uuid, uuid, text) SET search_path = public;
ALTER FUNCTION public.admin_settle_dispute(uuid, text) SET search_path = public;
ALTER FUNCTION public.admin_settle_dispute_v2(uuid, text) SET search_path = public;
ALTER FUNCTION public.award_spin_prize(uuid, integer) SET search_path = public;
ALTER FUNCTION public.dispute_product_escrow(uuid, uuid, text) SET search_path = public;
ALTER FUNCTION public.enforce_wallet_integrity() SET search_path = public;
ALTER FUNCTION public.handle_new_escrow() SET search_path = public;
ALTER FUNCTION public.handle_new_hire() SET search_path = public;
ALTER FUNCTION public.hire_and_escrow(uuid, uuid, uuid, uuid) SET search_path = public;
ALTER FUNCTION public.ironclad_wallet_lock() SET search_path = public;
ALTER FUNCTION public.lock_gig_price() SET search_path = public;
ALTER FUNCTION public.log_wallet_change() SET search_path = public;
ALTER FUNCTION public.prevent_double_refund_final() SET search_path = public;
ALTER FUNCTION public.profiles_guardian() SET search_path = public;
ALTER FUNCTION public.protect_sensitive_metadata() SET search_path = public;
ALTER FUNCTION public.protect_sensitive_metadata_v2() SET search_path = public;
ALTER FUNCTION public.protect_wallet_balance() SET search_path = public;
ALTER FUNCTION public.purchase_product_escrow(uuid, uuid, uuid) SET search_path = public;
ALTER FUNCTION public.release_product_escrow(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.resolve_frozen_wallet_dispute(uuid, text) SET search_path = public;
ALTER FUNCTION public.secure_mark_disputed(uuid) SET search_path = public;
ALTER FUNCTION public.smart_metadata_protection() SET search_path = public;
ALTER FUNCTION public.strict_profile_wallet_lockdown() SET search_path = public;
ALTER FUNCTION public.strict_refund_validation() SET search_path = public;
ALTER FUNCTION public.strict_transaction_lockdown() SET search_path = public;
ALTER FUNCTION public.strict_wallet_lockdown() SET search_path = public;
ALTER FUNCTION public.use_spin_ticket(uuid) SET search_path = public;

-- 4) RLS CONSOLIDATION
-- ---- PROFILES ---- (drop redundant, keep clean minimal set)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow Auth Select" ON public.profiles;
DROP POLICY IF EXISTS "Allow Auth Update" ON public.profiles;
DROP POLICY IF EXISTS "Dashboard_Admin_Access_Policy" ON public.profiles;
DROP POLICY IF EXISTS "Master Select" ON public.profiles;
DROP POLICY IF EXISTS "Profile Update" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can see own profile" ON public.profiles;

CREATE POLICY "profiles_public_read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ---- TASKS ----
DROP POLICY IF EXISTS "Admin Bypass Tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admin God Mode Tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admin can delete any task" ON public.tasks;
DROP POLICY IF EXISTS "Admins can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow public read access" ON public.tasks;
DROP POLICY IF EXISTS "Anyone can see tasks" ON public.tasks;
DROP POLICY IF EXISTS "Anyone can view open tasks" ON public.tasks;
DROP POLICY IF EXISTS "Master Select Tasks" ON public.tasks;
DROP POLICY IF EXISTS "Public Task View" ON public.tasks;
DROP POLICY IF EXISTS "Public can see tasks" ON public.tasks;
DROP POLICY IF EXISTS "admin_update_tasks" ON public.tasks;
DROP POLICY IF EXISTS "admin_update_tasks_dispute" ON public.tasks;

CREATE POLICY "tasks_public_read" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "tasks_admin_all" ON public.tasks FOR ALL TO authenticated
  USING (lower(auth.jwt() ->> 'email') = 'unigig60@gmail.com')
  WITH CHECK (lower(auth.jwt() ->> 'email') = 'unigig60@gmail.com');

-- ---- DISPUTES ----
DROP POLICY IF EXISTS "Admin Bypass Disputes" ON public.disputes;
DROP POLICY IF EXISTS "Admin God Mode Disputes" ON public.disputes;
DROP POLICY IF EXISTS "Admin manages disputes" ON public.disputes;
DROP POLICY IF EXISTS "Admin view all disputes" ON public.disputes;
DROP POLICY IF EXISTS "Admins can delete any dispute" ON public.disputes;
DROP POLICY IF EXISTS "Admins can update disputes" ON public.disputes;
DROP POLICY IF EXISTS "Admins can view all disputes" ON public.disputes;
DROP POLICY IF EXISTS "Dispute participants view" ON public.disputes;
DROP POLICY IF EXISTS "Users can create disputes" ON public.disputes;
DROP POLICY IF EXISTS "Users can file disputes" ON public.disputes;
DROP POLICY IF EXISTS "Users can view own disputes" ON public.disputes;
DROP POLICY IF EXISTS "Users can view their own disputes" ON public.disputes;
DROP POLICY IF EXISTS "admin_all_disputes" ON public.disputes;
DROP POLICY IF EXISTS "admin_update_disputes" ON public.disputes;

CREATE POLICY "disputes_participants_read" ON public.disputes FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id OR auth.uid() = reported_id
         OR lower(auth.jwt() ->> 'email') = 'unigig60@gmail.com');
CREATE POLICY "disputes_self_insert" ON public.disputes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "disputes_admin_manage" ON public.disputes FOR ALL TO authenticated
  USING (lower(auth.jwt() ->> 'email') = 'unigig60@gmail.com')
  WITH CHECK (lower(auth.jwt() ->> 'email') = 'unigig60@gmail.com');

-- ---- ESCROW ----
DROP POLICY IF EXISTS "Admins can read escrow" ON public.escrow_transactions;
DROP POLICY IF EXISTS "Admins can view all escrows" ON public.escrow_transactions;
DROP POLICY IF EXISTS "Enable escrow view" ON public.escrow_transactions;
DROP POLICY IF EXISTS "Service Role God Mode Escrow" ON public.escrow_transactions;
DROP POLICY IF EXISTS "Service role manages escrow" ON public.escrow_transactions;
DROP POLICY IF EXISTS "Users can create escrow" ON public.escrow_transactions;
DROP POLICY IF EXISTS "Users can create escrow as payer" ON public.escrow_transactions;
DROP POLICY IF EXISTS "Users can manage their own escrow" ON public.escrow_transactions;
DROP POLICY IF EXISTS "Users can only read own escrow" ON public.escrow_transactions;
DROP POLICY IF EXISTS "Users can see own escrow" ON public.escrow_transactions;
DROP POLICY IF EXISTS "Users can view their escrow transactions" ON public.escrow_transactions;
DROP POLICY IF EXISTS "admin_update_escrow" ON public.escrow_transactions;
DROP POLICY IF EXISTS "admin_update_escrow_dispute" ON public.escrow_transactions;

-- Keep block policies, add minimal new
CREATE POLICY "escrow_participants_read" ON public.escrow_transactions FOR SELECT TO authenticated
  USING (auth.uid() = payer_id OR auth.uid() = payee_id
         OR auth.uid() = poster_id OR auth.uid() = worker_id
         OR lower(auth.jwt() ->> 'email') = 'unigig60@gmail.com');
CREATE POLICY "escrow_admin_manage" ON public.escrow_transactions FOR ALL TO authenticated
  USING (lower(auth.jwt() ->> 'email') = 'unigig60@gmail.com')
  WITH CHECK (lower(auth.jwt() ->> 'email') = 'unigig60@gmail.com');

-- ---- WALLET TRANSACTIONS ----
DROP POLICY IF EXISTS "Users can only read own transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Users can see own transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Users can view own transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Users view own transactions" ON public.wallet_transactions;

CREATE POLICY "wallet_tx_self_read" ON public.wallet_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR lower(auth.jwt() ->> 'email') = 'unigig60@gmail.com');

-- ---- MESSAGES ----
DROP POLICY IF EXISTS "Admin can send any message" ON public.messages;
DROP POLICY IF EXISTS "Admin master send" ON public.messages;
DROP POLICY IF EXISTS "Admin master send access" ON public.messages;
DROP POLICY IF EXISTS "Admin master view access" ON public.messages;
DROP POLICY IF EXISTS "Admins can send messages to anyone" ON public.messages;
DROP POLICY IF EXISTS "Marketplace_allow_insert_messages" ON public.messages;
DROP POLICY IF EXISTS "Marketplace_allow_read_messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can read messages" ON public.messages;

-- Keep the strict task-scoped policies that were already there
-- ("Users can insert messages for their task chats", "Users can view messages for their task chats")
CREATE POLICY "messages_admin_all" ON public.messages FOR ALL TO authenticated
  USING (lower(auth.jwt() ->> 'email') = 'unigig60@gmail.com')
  WITH CHECK (lower(auth.jwt() ->> 'email') = 'unigig60@gmail.com');

-- ---- TASK APPLICATIONS ----
DROP POLICY IF EXISTS "Admins can view all applications" ON public.task_applications;
DROP POLICY IF EXISTS "Applicants can view their own applications" ON public.task_applications;
DROP POLICY IF EXISTS "Users can only see applications they own or for gigs they poste" ON public.task_applications;

CREATE POLICY "task_apps_self_or_poster_read" ON public.task_applications FOR SELECT TO authenticated
  USING (
    auth.uid() = applicant_id
    OR EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_applications.task_id AND t.poster_id = auth.uid())
    OR lower(auth.jwt() ->> 'email') = 'unigig60@gmail.com'
  );

-- ---- WITHDRAWAL REQUESTS ----
DROP POLICY IF EXISTS "Users can create withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Users can create withdrawals" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Users can view own withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Admin can view all withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Admin view all withdrawals" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Admin can update withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "admin_all_withdrawals" ON public.withdrawal_requests;

-- Block direct inserts; only process_withdrawal RPC may insert
CREATE POLICY "wd_block_direct_insert" ON public.withdrawal_requests FOR INSERT TO authenticated
  WITH CHECK (false);
CREATE POLICY "wd_self_read" ON public.withdrawal_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR lower(auth.jwt() ->> 'email') = 'unigig60@gmail.com');
CREATE POLICY "wd_admin_update" ON public.withdrawal_requests FOR UPDATE TO authenticated
  USING (lower(auth.jwt() ->> 'email') = 'unigig60@gmail.com')
  WITH CHECK (lower(auth.jwt() ->> 'email') = 'unigig60@gmail.com');

-- ---- APPEALS ----
DROP POLICY IF EXISTS "Anyone can read appeals" ON public.appeals;
DROP POLICY IF EXISTS "Posters can insert appeals" ON public.appeals;
DROP POLICY IF EXISTS "Users can create appeals" ON public.appeals;
DROP POLICY IF EXISTS "Users can view own appeals" ON public.appeals;
DROP POLICY IF EXISTS "Admin view all appeals" ON public.appeals;
DROP POLICY IF EXISTS "admin_all_appeals" ON public.appeals;

CREATE POLICY "appeals_self_read" ON public.appeals FOR SELECT TO authenticated
  USING (auth.uid() = poster_id OR lower(auth.jwt() ->> 'email') = 'unigig60@gmail.com');
CREATE POLICY "appeals_self_insert" ON public.appeals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = poster_id);
CREATE POLICY "appeals_admin_all" ON public.appeals FOR ALL TO authenticated
  USING (lower(auth.jwt() ->> 'email') = 'unigig60@gmail.com')
  WITH CHECK (lower(auth.jwt() ->> 'email') = 'unigig60@gmail.com');

-- ---- PRODUCTS ---- (consolidate dupes)
DROP POLICY IF EXISTS "Admin Master Delete" ON public.products;
DROP POLICY IF EXISTS "Admin full access" ON public.products;
DROP POLICY IF EXISTS "Admin_Full_Control" ON public.products;
CREATE POLICY "products_admin_all" ON public.products FOR ALL TO authenticated
  USING (lower(auth.jwt() ->> 'email') = 'unigig60@gmail.com')
  WITH CHECK (lower(auth.jwt() ->> 'email') = 'unigig60@gmail.com');

-- ---- ADMIN FEES / PLATFORM REVENUE ---- (drop dupes)
DROP POLICY IF EXISTS "Admins only" ON public.admin_fees;
DROP POLICY IF EXISTS "System Only" ON public.admin_fees;
CREATE POLICY "admin_fees_service" ON public.admin_fees FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "admin_fees_admin_read" ON public.admin_fees FOR SELECT TO authenticated
  USING (lower(auth.jwt() ->> 'email') = 'unigig60@gmail.com');

DROP POLICY IF EXISTS "Admins only" ON public.platform_revenue;
DROP POLICY IF EXISTS "System Only" ON public.platform_revenue;
CREATE POLICY "platform_rev_service" ON public.platform_revenue FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "platform_rev_admin_read" ON public.platform_revenue FOR SELECT TO authenticated
  USING (lower(auth.jwt() ->> 'email') = 'unigig60@gmail.com');

-- 5) Suspicious activity / chat rate-limit table
CREATE TABLE IF NOT EXISTS public.suspicious_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_email text,
  activity_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.suspicious_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sus_admin_read" ON public.suspicious_activity FOR SELECT TO authenticated
  USING (lower(auth.jwt() ->> 'email') = 'unigig60@gmail.com');
CREATE INDEX IF NOT EXISTS idx_sus_created ON public.suspicious_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sus_user ON public.suspicious_activity(user_id);

-- 6) Chat rate-limit + safety scan trigger on messages
CREATE OR REPLACE FUNCTION public.messages_guardian()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent_count INT;
  v_unsafe BOOLEAN := false;
BEGIN
  -- Rate-limit: max 20 messages per user per minute
  SELECT count(*) INTO v_recent_count
  FROM public.messages
  WHERE sender_id = NEW.sender_id
    AND created_at > now() - interval '1 minute';
  IF v_recent_count >= 20 THEN
    INSERT INTO public.suspicious_activity (user_id, activity_type, severity, details)
    VALUES (NEW.sender_id, 'chat_rate_limit', 'warn',
      jsonb_build_object('count', v_recent_count, 'task_id', NEW.task_id));
    RAISE EXCEPTION 'Rate limit: too many messages. Please wait a moment.';
  END IF;

  -- Server-side off-platform contact detection (backstop to client safety lib)
  IF NEW.content ~* '(\+?234|\b0[789][01]\d{8}\b|whatsapp|whats\s*app|telegram|\bwa\.me\b|@gmail|@yahoo|@outlook|@hotmail)' THEN
    INSERT INTO public.suspicious_activity (user_id, activity_type, severity, details)
    VALUES (NEW.sender_id, 'off_platform_contact', 'error',
      jsonb_build_object('preview', left(NEW.content, 200), 'task_id', NEW.task_id));
    RAISE EXCEPTION 'Message blocked: sharing phone numbers, emails, or external chat links is not allowed.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_guardian_trg ON public.messages;
CREATE TRIGGER messages_guardian_trg
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.messages_guardian();

-- 7) Helper RPC for admin monitoring stats
CREATE OR REPLACE FUNCTION public.admin_get_monitoring_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT := lower(auth.jwt() ->> 'email');
BEGIN
  IF v_email IS DISTINCT FROM 'unigig60@gmail.com' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN json_build_object(
    'total_users', (SELECT count(*) FROM profiles),
    'online_users', (SELECT count(*) FROM profiles WHERE last_seen_at > now() - interval '2 minutes'),
    'open_disputes', (SELECT count(*) FROM disputes WHERE status = 'pending'),
    'pending_withdrawals', (SELECT count(*) FROM withdrawal_requests WHERE status = 'pending'),
    'total_wallet_kobo', (SELECT coalesce(sum(wallet_balance),0) FROM profiles),
    'held_escrow_kobo', (SELECT coalesce(sum(amount_kobo),0) FROM escrow_transactions WHERE status = 'held'),
    'sus_24h', (SELECT count(*) FROM suspicious_activity WHERE created_at > now() - interval '24 hours'),
    'audit_24h', (SELECT count(*) FROM admin_audit_log WHERE created_at > now() - interval '24 hours')
  );
END;
$$;
