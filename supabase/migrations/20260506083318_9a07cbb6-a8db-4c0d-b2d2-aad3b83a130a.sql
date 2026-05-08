
-- ============================================================
-- 1. PROFILES: lock down sensitive columns
-- ============================================================
DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;

-- Public read of safe columns only (column-level grants enforce this)
CREATE POLICY "profiles_public_read_safe"
  ON public.profiles
  FOR SELECT
  TO public
  USING (true);

-- Revoke broad SELECT, then grant only safe columns to anon/authenticated
REVOKE SELECT ON public.profiles FROM anon, authenticated;

GRANT SELECT (
  id, full_name, avatar_url, bio, skills, university,
  completed_gigs, average_rating, is_verified, is_ambassador,
  created_at, updated_at, last_seen_at, referral_code,
  intro_video_url, has_completed_onboarding,
  fake_completed_gigs, fake_posted_gigs, fake_reviews
) ON public.profiles TO anon, authenticated;

-- Allow updates only on safe self-editable columns (wallet, role flags already blocked by guardian trigger)
GRANT UPDATE (
  full_name, avatar_url, bio, skills, university, phone,
  intro_video_url, last_seen_at, has_completed_onboarding,
  has_edited_referral, referral_code, referred_by,
  bank_name, account_number, account_name, recipient_code,
  verification_code, verification_expires_at
) ON public.profiles TO authenticated;

-- Secure self-read RPC: returns FULL row for the caller only
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS SETOF public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.profiles WHERE id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- Internal helper used by SECURITY DEFINER notification email flows
CREATE OR REPLACE FUNCTION public.get_user_email_internal(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM public.profiles WHERE id = p_user_id;
$$;
REVOKE EXECUTE ON FUNCTION public.get_user_email_internal(uuid) FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 2. MONEY RPCs: enforce auth.uid() instead of trusting client args
-- ============================================================

-- hire_and_escrow
CREATE OR REPLACE FUNCTION public.hire_and_escrow(
  p_task_id uuid, p_poster_id uuid, p_assignee_id uuid, p_application_id uuid DEFAULT NULL::uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_price_kobo BIGINT;
  v_current_balance_kobo BIGINT;
  v_new_balance_kobo BIGINT;
  v_task_poster UUID;
BEGIN
  -- Verify caller IS the poster of this task
  SELECT poster_id INTO v_task_poster FROM tasks WHERE id = p_task_id;
  IF v_task_poster IS NULL OR v_task_poster <> auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: only the gig poster can hire.';
  END IF;
  -- Force p_poster_id to caller (ignore client value)
  p_poster_id := auth.uid();

  SELECT price_kobo INTO v_price_kobo FROM tasks WHERE id = p_task_id;
  SELECT wallet_balance INTO v_current_balance_kobo FROM profiles WHERE id = p_poster_id;

  IF v_current_balance_kobo < v_price_kobo THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  v_new_balance_kobo := v_current_balance_kobo - v_price_kobo;
  UPDATE profiles SET wallet_balance = v_new_balance_kobo WHERE id = p_poster_id;
  UPDATE tasks SET status = 'assigned', assignee_id = p_assignee_id WHERE id = p_task_id;

  INSERT INTO escrow_transactions (task_id, poster_id, worker_id, amount_kobo, status)
  VALUES (p_task_id, p_poster_id, p_assignee_id, v_price_kobo, 'held');

  INSERT INTO wallet_transactions (user_id, type, amount_kobo, balance_after_kobo, reference, status)
  VALUES (p_poster_id, 'withdrawal', v_price_kobo, v_new_balance_kobo, 'ESCROW_' || p_task_id, 'success');

  RETURN json_build_object('success', true);
END;
$function$;

-- purchase_product_atomic
CREATE OR REPLACE FUNCTION public.purchase_product_atomic(p_product_id uuid, p_buyer_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_price_kobo BIGINT;
  v_seller_id UUID;
  v_stock INT;
  v_title TEXT;
  v_buyer_balance BIGINT;
  v_seller_balance BIGINT;
  v_platform_fee BIGINT;
  v_seller_earnings BIGINT;
  v_new_buyer_balance BIGINT;
  v_new_seller_balance BIGINT;
  v_order_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  -- Always force buyer to be caller (ignore client-provided id)
  p_buyer_id := auth.uid();

  SELECT price_kobo, seller_id, stock, title INTO v_price_kobo, v_seller_id, v_stock, v_title
  FROM products WHERE id = p_product_id AND is_available = true FOR UPDATE;

  IF v_price_kobo IS NULL THEN RETURN json_build_object('success', false, 'error', 'Product not found or unavailable'); END IF;
  IF v_seller_id = p_buyer_id THEN RETURN json_build_object('success', false, 'error', 'You cannot buy your own product'); END IF;
  IF v_stock <= 0 THEN RETURN json_build_object('success', false, 'error', 'Product is out of stock'); END IF;

  SELECT wallet_balance INTO v_buyer_balance FROM profiles WHERE id = p_buyer_id FOR UPDATE;
  IF v_buyer_balance IS NULL THEN RETURN json_build_object('success', false, 'error', 'Buyer not found'); END IF;
  IF v_buyer_balance < v_price_kobo THEN RETURN json_build_object('success', false, 'error', 'Insufficient wallet balance. Please deposit funds first.'); END IF;

  v_platform_fee := FLOOR(v_price_kobo * 0.15);
  v_seller_earnings := v_price_kobo - v_platform_fee;

  v_new_buyer_balance := v_buyer_balance - v_price_kobo;
  UPDATE profiles SET wallet_balance = v_new_buyer_balance, updated_at = now() WHERE id = p_buyer_id;

  SELECT wallet_balance INTO v_seller_balance FROM profiles WHERE id = v_seller_id FOR UPDATE;
  v_new_seller_balance := v_seller_balance + v_seller_earnings;
  UPDATE profiles SET wallet_balance = v_new_seller_balance, updated_at = now() WHERE id = v_seller_id;

  INSERT INTO product_orders (product_id, buyer_id, seller_id, total_kobo, platform_fee_kobo, status)
  VALUES (p_product_id, p_buyer_id, v_seller_id, v_price_kobo, v_platform_fee, 'paid')
  RETURNING id INTO v_order_id;

  UPDATE products SET stock = v_stock - 1, updated_at = now() WHERE id = p_product_id;

  INSERT INTO wallet_transactions (user_id, type, amount_kobo, balance_after_kobo, description, reference)
  VALUES
    (p_buyer_id, 'escrow_hold', v_price_kobo, v_new_buyer_balance, 'Purchase: ' || v_title, 'ORDER_' || v_order_id::TEXT),
    (v_seller_id, 'escrow_release', v_seller_earnings, v_new_seller_balance, 'Sale: ' || v_title, 'ORDER_' || v_order_id::TEXT);

  INSERT INTO admin_fees (transaction_type, source_user_id, amount_kobo, reference, status)
  VALUES ('product_sale', v_seller_id, v_platform_fee, 'ORDER_' || v_order_id::TEXT, 'collected');

  INSERT INTO notifications (user_id, title, body, data)
  VALUES (v_seller_id, '🛒 New Sale!', 'Someone purchased "' || v_title || '" for ₦' || (v_price_kobo / 100)::TEXT, json_build_object('type', 'product_sale', 'orderId', v_order_id, 'productId', p_product_id)::jsonb);
  INSERT INTO notifications (user_id, title, body, data)
  VALUES (p_buyer_id, '✅ Purchase Successful', 'You bought "' || v_title || '" for ₦' || (v_price_kobo / 100)::TEXT, json_build_object('type', 'product_purchase', 'orderId', v_order_id, 'productId', p_product_id)::jsonb);

  RETURN json_build_object('success', true, 'order_id', v_order_id, 'new_buyer_balance', v_new_buyer_balance, 'seller_earnings', v_seller_earnings);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- freeze_poster_funds: only the dispute reporter (caller) can freeze
CREATE OR REPLACE FUNCTION public.freeze_poster_funds(p_task_id uuid, p_reporter_id uuid, p_poster_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_task_status TEXT;
  v_price_kobo BIGINT;
  v_poster_balance BIGINT;
  v_new_balance BIGINT;
  v_escrow_id UUID;
  v_actual_poster UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  -- Force reporter to be the caller
  p_reporter_id := auth.uid();

  SELECT status, price_kobo, poster_id INTO v_task_status, v_price_kobo, v_actual_poster
  FROM tasks WHERE id = p_task_id;
  IF v_task_status IS NULL THEN RETURN json_build_object('success', false, 'error', 'Task not found'); END IF;
  -- Use real poster from DB (ignore client value)
  p_poster_id := v_actual_poster;
  IF p_poster_id = p_reporter_id THEN
    RETURN json_build_object('success', false, 'error', 'You cannot freeze your own funds');
  END IF;

  SELECT wallet_balance INTO v_poster_balance FROM profiles WHERE id = p_poster_id FOR UPDATE;
  IF v_poster_balance < v_price_kobo THEN v_price_kobo := v_poster_balance; END IF;
  IF v_price_kobo <= 0 THEN RETURN json_build_object('success', true, 'frozen', false, 'reason', 'No funds to freeze'); END IF;

  v_new_balance := v_poster_balance - v_price_kobo;
  UPDATE profiles SET wallet_balance = v_new_balance, updated_at = now() WHERE id = p_poster_id;

  INSERT INTO escrow_transactions (task_id, payer_id, payee_id, amount_kobo, platform_fee_kobo, status)
  VALUES (p_task_id, p_poster_id, p_reporter_id, v_price_kobo, 0, 'disputed')
  RETURNING id INTO v_escrow_id;

  INSERT INTO wallet_transactions (user_id, type, amount_kobo, balance_after_kobo, description, reference, escrow_id)
  VALUES (p_poster_id, 'escrow_hold', v_price_kobo, v_new_balance, 'Funds frozen - dispute under review', 'FREEZE_' || v_escrow_id::TEXT, v_escrow_id);

  UPDATE tasks SET status = 'disputed', updated_at = now() WHERE id = p_task_id;

  INSERT INTO notifications (user_id, title, body, data)
  VALUES (p_poster_id, '⚠️ Funds Frozen',
    'Your recent cancellation is under review. ₦' || (v_price_kobo / 100)::TEXT || ' has been temporarily frozen.',
    json_build_object('type', 'funds_frozen', 'taskId', p_task_id, 'amount_kobo', v_price_kobo)::jsonb);

  RETURN json_build_object('success', true, 'frozen', true, 'amount_kobo', v_price_kobo, 'escrow_id', v_escrow_id, 'new_balance', v_new_balance);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- cancel_and_refund_escrow: force user_id from auth.uid()
CREATE OR REPLACE FUNCTION public.cancel_and_refund_escrow(p_task_id uuid, p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_escrow_id UUID;
  v_escrow_status TEXT;
  v_amount_kobo BIGINT;
  v_payer_id UUID;
  v_payee_id UUID;
  v_poster_id UUID;
  v_task_status TEXT;
  v_current_balance BIGINT;
  v_new_balance BIGINT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  p_user_id := auth.uid();

  SELECT poster_id, assignee_id, status INTO v_poster_id, v_payee_id, v_task_status
  FROM tasks WHERE id = p_task_id FOR UPDATE;
  IF v_poster_id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Task not found'); END IF;

  IF p_user_id != v_poster_id AND p_user_id != v_payee_id THEN
    RETURN json_build_object('success', false, 'error', 'Only the poster or worker can cancel');
  END IF;
  IF v_task_status IN ('completed', 'cancelled') THEN
    RETURN json_build_object('success', false, 'error', 'Task is already ' || v_task_status);
  END IF;

  SELECT id, status, amount_kobo, payer_id, payee_id INTO v_escrow_id, v_escrow_status, v_amount_kobo, v_payer_id, v_payee_id
  FROM escrow_transactions WHERE task_id = p_task_id FOR UPDATE;

  IF v_escrow_id IS NOT NULL AND v_escrow_status = 'held' THEN
    SELECT wallet_balance INTO v_current_balance FROM profiles WHERE id = v_payer_id FOR UPDATE;
    v_new_balance := v_current_balance + v_amount_kobo;
    UPDATE profiles SET wallet_balance = v_new_balance, updated_at = now() WHERE id = v_payer_id;
    UPDATE escrow_transactions SET status = 'refunded', updated_at = now() WHERE id = v_escrow_id;
    INSERT INTO wallet_transactions (user_id, type, amount_kobo, balance_after_kobo, description, reference, escrow_id)
    VALUES (v_payer_id, 'refund', v_amount_kobo, v_new_balance, 'Escrow refund - gig cancelled', 'CANCEL_' || v_escrow_id::TEXT, v_escrow_id);

    IF p_user_id = v_payer_id AND v_payee_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, body, data)
      VALUES (v_payee_id, 'Gig Cancelled', 'The poster cancelled the gig. Escrow funds have been refunded.', json_build_object('taskId', p_task_id)::jsonb);
    ELSIF v_payer_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, body, data)
      VALUES (v_payer_id, 'Gig Cancelled', 'The worker cancelled the gig. Your escrow funds have been refunded to your wallet.', json_build_object('taskId', p_task_id)::jsonb);
    END IF;
  END IF;

  UPDATE tasks SET status = 'cancelled', updated_at = now() WHERE id = p_task_id;
  RETURN json_build_object('success', true, 'refunded', v_escrow_id IS NOT NULL AND v_escrow_status = 'held',
    'refund_amount', COALESCE(v_amount_kobo, 0), 'new_balance', COALESCE(v_new_balance, 0));
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- ============================================================
-- 3. NOTIFICATIONS: restrict insert to self or task participants
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;

CREATE POLICY "Notifications insert self or task party"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR (
      data ? 'taskId'
      AND EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.id::text = data->>'taskId'
          AND (t.poster_id = auth.uid() OR t.assignee_id = auth.uid())
          AND (t.poster_id = notifications.user_id OR t.assignee_id = notifications.user_id)
      )
    )
  );

-- ============================================================
-- 4. PRODUCT ORDERS: block direct inserts (must use RPC)
-- ============================================================
DROP POLICY IF EXISTS "Users can create orders" ON public.product_orders;
CREATE POLICY "Block direct product order inserts"
  ON public.product_orders
  FOR INSERT
  TO public
  WITH CHECK (false);

-- ============================================================
-- 5. ADMIN_FEES: drop overly broad read policy
-- ============================================================
DROP POLICY IF EXISTS "Fees are read-only" ON public.admin_fees;

-- ============================================================
-- 6. CHAT-ATTACHMENTS storage: enforce path ownership
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can upload chat attachments" ON storage.objects;
CREATE POLICY "Users upload chat attachments to own folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- Tighten bucket constraints (avatars + chat-attachments)
UPDATE storage.buckets
   SET file_size_limit = 2097152,
       allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp']
 WHERE id = 'avatars';

UPDATE storage.buckets
   SET file_size_limit = 10485760,
       allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif',
                                  'application/pdf','application/zip',
                                  'application/msword',
                                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
 WHERE id = 'chat-attachments';

-- ============================================================
-- 7. handle_new_user: validate input
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name TEXT;
  v_university TEXT;
BEGIN
  v_full_name := TRIM(COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''));
  IF LENGTH(v_full_name) > 100 THEN v_full_name := LEFT(v_full_name, 100); END IF;
  v_full_name := REGEXP_REPLACE(v_full_name, '[^a-zA-Z0-9 .\-'']', '', 'g');
  IF LENGTH(v_full_name) = 0 THEN v_full_name := 'User'; END IF;

  v_university := TRIM(COALESCE(NEW.raw_user_meta_data ->> 'university', ''));
  IF LENGTH(v_university) > 200 THEN v_university := LEFT(v_university, 200); END IF;
  v_university := REGEXP_REPLACE(v_university, '[^a-zA-Z0-9 .\-,()]', '', 'g');

  INSERT INTO public.profiles (id, email, full_name, university)
  VALUES (NEW.id, NEW.email, v_full_name, NULLIF(v_university, ''))
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    university = COALESCE(EXCLUDED.university, profiles.university);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, 'User')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
