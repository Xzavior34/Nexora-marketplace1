-- Create a function to clean up old messages (older than 1 month)
CREATE OR REPLACE FUNCTION public.cleanup_old_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_messages INTEGER;
  deleted_tasks INTEGER;
BEGIN
  -- Delete messages older than 1 month
  DELETE FROM public.messages
  WHERE created_at < NOW() - INTERVAL '1 month';
  
  GET DIAGNOSTICS deleted_messages = ROW_COUNT;
  RAISE NOTICE 'Deleted % old messages', deleted_messages;
  
  -- Delete completed/cancelled tasks older than 1 month (and their related data)
  -- First delete related records
  DELETE FROM public.task_applications
  WHERE task_id IN (
    SELECT id FROM public.tasks
    WHERE status IN ('completed', 'cancelled')
    AND updated_at < NOW() - INTERVAL '1 month'
  );
  
  DELETE FROM public.saved_gigs
  WHERE task_id IN (
    SELECT id FROM public.tasks
    WHERE status IN ('completed', 'cancelled')
    AND updated_at < NOW() - INTERVAL '1 month'
  );
  
  -- Delete escrow transactions for old completed tasks
  DELETE FROM public.escrow_transactions
  WHERE task_id IN (
    SELECT id FROM public.tasks
    WHERE status IN ('completed', 'cancelled')
    AND updated_at < NOW() - INTERVAL '1 month'
  )
  AND status IN ('released', 'refunded');
  
  -- Finally delete the old tasks
  DELETE FROM public.tasks
  WHERE status IN ('completed', 'cancelled')
  AND updated_at < NOW() - INTERVAL '1 month';
  
  GET DIAGNOSTICS deleted_tasks = ROW_COUNT;
  RAISE NOTICE 'Deleted % old completed/cancelled tasks', deleted_tasks;
END;
$$;

-- Create an extension for pg_cron if not exists (for scheduled cleanup)
-- Note: pg_cron needs to be enabled in Supabase dashboard
-- Schedule the cleanup to run daily at 3 AM UTC
-- SELECT cron.schedule('cleanup-old-data', '0 3 * * *', 'SELECT public.cleanup_old_data()');

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.cleanup_old_data() TO service_role;