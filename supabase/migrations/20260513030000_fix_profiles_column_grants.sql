-- Migration: Grant SELECT permissions on sensitive columns to authenticated users
GRANT SELECT (
  phone,
  email,
  wallet_balance,
  vault_balance,
  auto_save_percentage,
  vault_locked_until,
  bank_name,
  account_number,
  account_name,
  recipient_code,
  virtual_account_number,
  virtual_bank_name,
  is_verified,
  is_admin
) ON public.profiles TO authenticated;

-- Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';
