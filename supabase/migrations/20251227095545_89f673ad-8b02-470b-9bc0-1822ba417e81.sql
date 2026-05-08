-- Add phone field to products table for sellers
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS seller_phone TEXT;

-- Add platform_revenue table for tracking 15% commission to admin
-- This helps track fees that should be paid to the admin OPay account
CREATE TABLE IF NOT EXISTS public.admin_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type TEXT NOT NULL, -- 'deposit', 'gig_completion', 'product_sale'
  source_user_id UUID NOT NULL REFERENCES public.profiles(id),
  amount_kobo BIGINT NOT NULL,
  reference TEXT,
  admin_account TEXT DEFAULT '9064513390', -- Admin OPay account
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending' -- 'pending', 'processed'
);

-- RLS for admin_fees - only backend can insert, no public access
ALTER TABLE public.admin_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No public access to admin fees"
  ON public.admin_fees
  FOR SELECT
  USING (false);