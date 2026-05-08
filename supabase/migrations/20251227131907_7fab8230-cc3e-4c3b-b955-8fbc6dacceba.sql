-- Create withdrawal_requests table for manual payout processing
CREATE TABLE public.withdrawal_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_kobo BIGINT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
  admin_notes TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own withdrawal requests
CREATE POLICY "Users can view own withdrawal requests"
ON public.withdrawal_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own withdrawal requests
CREATE POLICY "Users can create withdrawal requests"
ON public.withdrawal_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admin can view all withdrawal requests (using email check)
CREATE POLICY "Admin can view all withdrawal requests"
ON public.withdrawal_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.email = 'inempu.25@student.funaab.edu.ng'
  )
);

-- Admin can update withdrawal requests
CREATE POLICY "Admin can update withdrawal requests"
ON public.withdrawal_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.email = 'inempu.25@student.funaab.edu.ng'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_withdrawal_requests_updated_at
BEFORE UPDATE ON public.withdrawal_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();