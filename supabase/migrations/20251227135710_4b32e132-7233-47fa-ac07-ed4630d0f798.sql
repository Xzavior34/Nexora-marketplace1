-- Drop the existing admin RLS policies that use auth.users
DROP POLICY IF EXISTS "Admin can view all withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Admin can update withdrawal requests" ON public.withdrawal_requests;

-- Create new admin RLS policies using profiles table instead
CREATE POLICY "Admin can view all withdrawal requests" 
ON public.withdrawal_requests 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.email = 'inempu.25@student.funaab.edu.ng'
  )
);

CREATE POLICY "Admin can update withdrawal requests" 
ON public.withdrawal_requests 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.email = 'inempu.25@student.funaab.edu.ng'
  )
);