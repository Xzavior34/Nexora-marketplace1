-- Migration: Add virtual_account_number and virtual_bank_name to public.profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS virtual_account_number TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS virtual_bank_name TEXT DEFAULT NULL;

-- Allow authenticated users to edit/update their own virtual account fields if necessary
GRANT UPDATE (virtual_account_number, virtual_bank_name) ON public.profiles TO authenticated;

NOTIFY pgrst, 'reload schema';
