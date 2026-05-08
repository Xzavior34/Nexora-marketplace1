-- Allow admin to delete any task
CREATE POLICY "Admin can delete any task"
ON public.tasks FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.email = 'unigig60@gmail.com'
  )
);

-- Allow admin to delete any product
CREATE POLICY "Admin can delete any product"
ON public.products FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.email = 'unigig60@gmail.com'
  )
);

-- Allow admin to view all withdrawal requests
DROP POLICY IF EXISTS "Admin can view all withdrawal requests" ON public.withdrawal_requests;
CREATE POLICY "Admin can view all withdrawal requests"
ON public.withdrawal_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.email = 'unigig60@gmail.com'
  )
);

-- Allow admin to update withdrawal requests
DROP POLICY IF EXISTS "Admin can update withdrawal requests" ON public.withdrawal_requests;
CREATE POLICY "Admin can update withdrawal requests"
ON public.withdrawal_requests FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.email = 'unigig60@gmail.com'
  )
);