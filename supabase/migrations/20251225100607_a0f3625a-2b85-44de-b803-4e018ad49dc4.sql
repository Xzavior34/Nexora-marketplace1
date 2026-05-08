-- Create enum for task status
CREATE TYPE public.task_status AS ENUM ('open', 'assigned', 'in_progress', 'completed', 'cancelled', 'disputed');

-- Create enum for escrow status
CREATE TYPE public.escrow_status AS ENUM ('pending', 'held', 'released', 'refunded', 'disputed');

-- Create enum for transaction type
CREATE TYPE public.transaction_type AS ENUM ('deposit', 'escrow_hold', 'escrow_release', 'commission', 'withdrawal', 'refund');

-- Profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  wallet_balance BIGINT NOT NULL DEFAULT 0, -- stored in Kobo
  bank_name TEXT,
  account_number TEXT,
  account_name TEXT,
  recipient_code TEXT, -- Paystack recipient code for transfers
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verification_code TEXT,
  verification_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tasks/Gigs table
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poster_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  price_kobo BIGINT NOT NULL, -- Price in Kobo (₦1 = 100 Kobo)
  attachment_url TEXT,
  status public.task_status NOT NULL DEFAULT 'open',
  location TEXT,
  deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Escrow transactions table
CREATE TABLE public.escrow_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  payer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  payee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_kobo BIGINT NOT NULL,
  platform_fee_kobo BIGINT NOT NULL, -- 20% commission
  paystack_reference TEXT,
  paystack_transfer_code TEXT,
  status public.escrow_status NOT NULL DEFAULT 'pending',
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Wallet transactions table for audit trail
CREATE TABLE public.wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type public.transaction_type NOT NULL,
  amount_kobo BIGINT NOT NULL,
  balance_after_kobo BIGINT NOT NULL,
  reference TEXT,
  description TEXT,
  escrow_id UUID REFERENCES public.escrow_transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Platform revenue table
CREATE TABLE public.platform_revenue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  escrow_id UUID NOT NULL REFERENCES public.escrow_transactions(id) ON DELETE CASCADE,
  amount_kobo BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_revenue ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Tasks policies
CREATE POLICY "Anyone can view open tasks" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Users can create tasks" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = poster_id);
CREATE POLICY "Task owners can update their tasks" ON public.tasks FOR UPDATE USING (auth.uid() = poster_id OR auth.uid() = assignee_id);
CREATE POLICY "Task owners can delete their tasks" ON public.tasks FOR DELETE USING (auth.uid() = poster_id AND status = 'open');

-- Escrow policies
CREATE POLICY "Users can view their escrow transactions" ON public.escrow_transactions FOR SELECT USING (auth.uid() = payer_id OR auth.uid() = payee_id);
CREATE POLICY "Users can create escrow as payer" ON public.escrow_transactions FOR INSERT WITH CHECK (auth.uid() = payer_id);

-- Wallet transaction policies
CREATE POLICY "Users can view own transactions" ON public.wallet_transactions FOR SELECT USING (auth.uid() = user_id);

-- Platform revenue - admin only (no public access)
CREATE POLICY "No public access to revenue" ON public.platform_revenue FOR SELECT USING (false);

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name'
  );
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_escrow_updated_at
  BEFORE UPDATE ON public.escrow_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();