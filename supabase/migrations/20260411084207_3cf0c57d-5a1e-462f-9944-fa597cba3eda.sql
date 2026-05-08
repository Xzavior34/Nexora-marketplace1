
-- Atomic cancel + refund escrow function
CREATE OR REPLACE FUNCTION public.cancel_and_refund_escrow(
  p_task_id UUID,
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  -- Lock and get task
  SELECT poster_id, assignee_id, status INTO v_poster_id, v_payee_id, v_task_status
  FROM tasks WHERE id = p_task_id FOR UPDATE;

  IF v_poster_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Task not found');
  END IF;

  -- Only poster or assignee can cancel
  IF p_user_id != v_poster_id AND p_user_id != v_payee_id THEN
    RETURN json_build_object('success', false, 'error', 'Only the poster or worker can cancel');
  END IF;

  IF v_task_status IN ('completed', 'cancelled') THEN
    RETURN json_build_object('success', false, 'error', 'Task is already ' || v_task_status);
  END IF;

  -- Check for escrow
  SELECT id, status, amount_kobo, payer_id, payee_id INTO v_escrow_id, v_escrow_status, v_amount_kobo, v_payer_id, v_payee_id
  FROM escrow_transactions WHERE task_id = p_task_id FOR UPDATE;

  -- If escrow exists and is held, refund it
  IF v_escrow_id IS NOT NULL AND v_escrow_status = 'held' THEN
    -- Get payer balance
    SELECT wallet_balance INTO v_current_balance
    FROM profiles WHERE id = v_payer_id FOR UPDATE;

    v_new_balance := v_current_balance + v_amount_kobo;

    -- Refund to payer
    UPDATE profiles SET wallet_balance = v_new_balance, updated_at = now()
    WHERE id = v_payer_id;

    -- Update escrow
    UPDATE escrow_transactions SET status = 'refunded', updated_at = now()
    WHERE id = v_escrow_id;

    -- Record refund transaction
    INSERT INTO wallet_transactions (user_id, type, amount_kobo, balance_after_kobo, description, reference, escrow_id)
    VALUES (v_payer_id, 'refund', v_amount_kobo, v_new_balance, 'Escrow refund - gig cancelled', 'CANCEL_' || v_escrow_id::TEXT, v_escrow_id);

    -- Notify the other party
    IF p_user_id = v_payer_id AND v_payee_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, body, data)
      VALUES (v_payee_id, 'Gig Cancelled', 'The poster cancelled the gig. Escrow funds have been refunded.', json_build_object('taskId', p_task_id)::jsonb);
    ELSIF v_payer_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, body, data)
      VALUES (v_payer_id, 'Gig Cancelled', 'The worker cancelled the gig. Your escrow funds have been refunded to your wallet.', json_build_object('taskId', p_task_id)::jsonb);
    END IF;
  END IF;

  -- Cancel the task
  UPDATE tasks SET status = 'cancelled', updated_at = now()
  WHERE id = p_task_id;

  RETURN json_build_object(
    'success', true,
    'refunded', v_escrow_id IS NOT NULL AND v_escrow_status = 'held',
    'refund_amount', COALESCE(v_amount_kobo, 0),
    'new_balance', COALESCE(v_new_balance, 0)
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Atomic marketplace purchase function
CREATE OR REPLACE FUNCTION public.purchase_product_atomic(
  p_product_id UUID,
  p_buyer_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  -- Lock product
  SELECT price_kobo, seller_id, stock, title INTO v_price_kobo, v_seller_id, v_stock, v_title
  FROM products WHERE id = p_product_id AND is_available = true FOR UPDATE;

  IF v_price_kobo IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Product not found or unavailable');
  END IF;

  IF v_seller_id = p_buyer_id THEN
    RETURN json_build_object('success', false, 'error', 'You cannot buy your own product');
  END IF;

  IF v_stock <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Product is out of stock');
  END IF;

  -- Lock buyer balance
  SELECT wallet_balance INTO v_buyer_balance
  FROM profiles WHERE id = p_buyer_id FOR UPDATE;

  IF v_buyer_balance IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Buyer not found');
  END IF;

  IF v_buyer_balance < v_price_kobo THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient wallet balance. Please deposit funds first.');
  END IF;

  -- Calculate fees
  v_platform_fee := FLOOR(v_price_kobo * 0.15);
  v_seller_earnings := v_price_kobo - v_platform_fee;

  -- Deduct from buyer
  v_new_buyer_balance := v_buyer_balance - v_price_kobo;
  UPDATE profiles SET wallet_balance = v_new_buyer_balance, updated_at = now()
  WHERE id = p_buyer_id;

  -- Credit seller
  SELECT wallet_balance INTO v_seller_balance
  FROM profiles WHERE id = v_seller_id FOR UPDATE;
  v_new_seller_balance := v_seller_balance + v_seller_earnings;
  UPDATE profiles SET wallet_balance = v_new_seller_balance, updated_at = now()
  WHERE id = v_seller_id;

  -- Create order
  INSERT INTO product_orders (product_id, buyer_id, seller_id, total_kobo, platform_fee_kobo, status)
  VALUES (p_product_id, p_buyer_id, v_seller_id, v_price_kobo, v_platform_fee, 'paid')
  RETURNING id INTO v_order_id;

  -- Update stock
  UPDATE products SET stock = v_stock - 1, updated_at = now()
  WHERE id = p_product_id;

  -- Wallet transactions
  INSERT INTO wallet_transactions (user_id, type, amount_kobo, balance_after_kobo, description, reference)
  VALUES
    (p_buyer_id, 'escrow_hold', v_price_kobo, v_new_buyer_balance, 'Purchase: ' || v_title, 'ORDER_' || v_order_id::TEXT),
    (v_seller_id, 'escrow_release', v_seller_earnings, v_new_seller_balance, 'Sale: ' || v_title, 'ORDER_' || v_order_id::TEXT);

  -- Log admin fee
  INSERT INTO admin_fees (transaction_type, source_user_id, amount_kobo, reference, status)
  VALUES ('product_sale', v_seller_id, v_platform_fee, 'ORDER_' || v_order_id::TEXT, 'collected');

  -- Notify seller
  INSERT INTO notifications (user_id, title, body, data)
  VALUES (v_seller_id, '🛒 New Sale!', 'Someone purchased "' || v_title || '" for ₦' || (v_price_kobo / 100)::TEXT, json_build_object('type', 'product_sale', 'orderId', v_order_id, 'productId', p_product_id)::jsonb);

  -- Notify buyer
  INSERT INTO notifications (user_id, title, body, data)
  VALUES (p_buyer_id, '✅ Purchase Successful', 'You bought "' || v_title || '" for ₦' || (v_price_kobo / 100)::TEXT, json_build_object('type', 'product_purchase', 'orderId', v_order_id, 'productId', p_product_id)::jsonb);

  RETURN json_build_object(
    'success', true,
    'order_id', v_order_id,
    'new_buyer_balance', v_new_buyer_balance,
    'seller_earnings', v_seller_earnings
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;
