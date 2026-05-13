-- Migration: Grant SELECT permissions on sensitive columns dynamically (only if they exist)
DO $$
DECLARE
    col text;
    cols text[] := ARRAY[
        'phone',
        'email',
        'wallet_balance',
        'vault_balance',
        'auto_save_percentage',
        'vault_locked_until',
        'bank_name',
        'account_number',
        'account_name',
        'recipient_code',
        'virtual_account_number',
        'virtual_bank_name',
        'is_verified',
        'is_admin'
    ];
BEGIN
    FOREACH col IN ARRAY cols LOOP
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'profiles' 
              AND column_name = col
        ) THEN
            EXECUTE format('GRANT SELECT (%I) ON public.profiles TO authenticated', col);
        END IF;
    END LOOP;
END;
$$;

-- Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';
